import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import {
  MOYENS_EN_LIGNE,
  TYPE_PANNE_LABELS,
  estMoyenPaiement,
  estTypePanne,
  tarifDe,
  totauxFacture,
} from "@/lib/constants";

/**
 * Invoicing and settlement.
 *
 * The money model in one paragraph: **the subscriber owes the company, never
 * the technician.** An invoice is emitted at closure and belongs to the
 * intervention. Card, transfer and D17 reach the company directly. Cash is the
 * exception — the subscriber hands it to the technician on site, so that
 * payment carries a `technicienId` and turns into a debt the technician settles
 * later by remitting the money (`Versement`).
 *
 * **Nothing here ever pays a technician.** Salaries are the company's own
 * accounting, not this application's business: it follows interventions and
 * what the *subscriber* owes, and stops where payroll begins. The cash circuit
 * is not an exception to that — money in a technician's pocket belongs to the
 * company, and remitting it is the last step of the subscriber's payment.
 *
 * Every amount is an integer number of millimes — see lib/monnaie.ts.
 */

/** Prisma client ou client de transaction : les deux conviennent. */
type Db = Prisma.TransactionClient;

/* -------------------------------------------------------------------------- */
/* Numerotation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Sequential, human-readable references: `FC-2026-0007`, `ESP-2026-0042`.
 *
 * A cuid is unique but unusable — nobody reads one out over the phone, and a
 * subscriber calling about "sa facture" needs something they can say. The
 * counter restarts each year, which is what an accountant expects to see.
 *
 * Deliberately computed inside the caller's transaction: SQLite serialises
 * writers, so two closures cannot land on the same number. Should it ever
 * happen anyway, the `@unique` column refuses the second one rather than
 * silently merging two invoices.
 */
async function prochaineReference(
  prefixe: string,
  compter: (debut: string) => Promise<number>,
): Promise<string> {
  const annee = new Date().getFullYear();
  const debut = `${prefixe}-${annee}-`;
  const rang = (await compter(debut)) + 1;
  return `${debut}${String(rang).padStart(4, "0")}`;
}

function numeroFacture(db: Db) {
  return prochaineReference("FC", (debut) =>
    db.facture.count({ where: { numero: { startsWith: debut } } }),
  );
}

function referencePaiement(db: Db, prefixe: "ESP" | "PAY") {
  return prochaineReference(prefixe, (debut) =>
    db.paiement.count({ where: { reference: { startsWith: debut } } }),
  );
}

/* -------------------------------------------------------------------------- */
/* Emission de la facture                                                     */
/* -------------------------------------------------------------------------- */

/** Une pièce remplacée, ajoutée par le technicien au moment de la clôture. */
export type PieceFacturee = {
  designation: string;
  /** En millimes, **hors taxes**. */
  montant: number;
};


/**
 * Emits the invoice for a closed intervention.
 *
 * Takes the transaction client rather than opening its own: the invoice is
 * written in the *same* transaction as the closure. Splitting them would allow
 * a completed job with no invoice — a state neither the subscriber nor the
 * company could act on, and one nobody would notice until the month-end
 * figures came out short.
 *
 * The first line is always the call-out at the published tariff for the fault
 * type, the price the subscriber was shown when they declared it. Parts come
 * after, one line each.
 */
export async function emettreFacture(
  db: Db,
  {
    interventionId,
    typePanne,
    pieces = [],
  }: {
    interventionId: string;
    typePanne: string;
    pieces?: PieceFacturee[];
  },
) {
  const deja = await db.facture.findUnique({
    where: { interventionId },
    select: { id: true },
  });
  if (deja) {
    throw new ErreurMetier("Cette intervention a déjà une facture.");
  }

  const libelle = estTypePanne(typePanne)
    ? TYPE_PANNE_LABELS[typePanne]
    : "Intervention";

  const lignes: PieceFacturee[] = [
    {
      designation: `Déplacement et main-d’œuvre — ${libelle}`,
      montant: tarifDe(typePanne),
    },
    ...pieces,
  ];

  return db.facture.create({
    data: {
      interventionId,
      numero: await numeroFacture(db),
      ...totauxFacture(lignes),
      statut: "A_PAYER",
      lignes: { create: lignes },
    },
    include: { lignes: true },
  });
}

/* -------------------------------------------------------------------------- */
/* Rectification par le superviseur                                           */
/* -------------------------------------------------------------------------- */

/**
 * Correcting and cancelling an invoice — the supervisor's two escape hatches.
 *
 * A technician who types 2100 DT instead of 210 DT creates a debt the
 * subscriber cannot dispute and nobody could fix; that is not an acceptable
 * state for an application that prints amounts. So an unpaid invoice can be
 * corrected, and one that should never have been issued can be cancelled.
 *
 * Both refuse as soon as **any** payment has been confirmed, even partially.
 * Moving the total under the feet of someone who has already paid part of it
 * produces a figure neither side can reconcile; that case needs a credit note,
 * which this version does not have (see the README's known limits).
 *
 * Both require a reason, stored on the invoice. An amount that changes without
 * anyone knowing why is indefensible in front of the subscriber and in front of
 * the technician who drew it up.
 */
async function exigerRectifiable(db: Db, factureId: string) {
  const facture = await db.facture.findUnique({
    where: { id: factureId },
    select: { id: true, statut: true, numero: true },
  });
  if (!facture) {
    throw new ErreurMetier("Cette facture n’existe pas.", 404);
  }
  if (facture.statut === "ANNULEE") {
    throw new ErreurMetier("Cette facture est déjà annulée.");
  }
  if (facture.statut === "PAYEE") {
    throw new ErreurMetier(
      "Cette facture est soldée : elle ne peut plus être modifiée.",
    );
  }

  const regles = await db.paiement.count({
    where: { factureId, statut: "CONFIRME" },
  });
  if (regles > 0) {
    throw new ErreurMetier(
      "Cette facture a déjà reçu un règlement partiel : son montant ne peut plus changer.",
    );
  }

  return facture;
}

/** Remplace les lignes d'une facture non réglée et recalcule son total. */
export async function corrigerFacture({
  factureId,
  superviseurId,
  motif,
  lignes,
}: {
  factureId: string;
  superviseurId: string;
  motif: string;
  lignes: PieceFacturee[];
}) {
  if (lignes.length === 0) {
    throw new ErreurMetier(
      "Une facture doit garder au moins une ligne. Pour ne rien facturer, annulez-la.",
      400,
    );
  }

  return prisma.$transaction(async (tx) => {
    await exigerRectifiable(tx, factureId);

    await tx.ligneFacture.deleteMany({ where: { factureId } });

    return tx.facture.update({
      where: { id: factureId },
      data: {
        ...totauxFacture(lignes),
        lignes: { create: lignes },
        motifRectification: motif,
        dateRectification: new Date(),
        rectifieePar: superviseurId,
      },
      include: { lignes: true },
    });
  });
}

/**
 * Annule une facture qui n'aurait pas dû être émise.
 *
 * Terminal : une facture annulée ne se rouvre pas et l'intervention n'en reçoit
 * pas de nouvelle — la relation est un-à-un. C'est le geste du « rien à
 * facturer » (garantie, geste commercial), pas celui de la faute de frappe, qui
 * se répare avec `corrigerFacture`.
 */
export async function annulerFacture({
  factureId,
  superviseurId,
  motif,
}: {
  factureId: string;
  superviseurId: string;
  motif: string;
}) {
  return prisma.$transaction(async (tx) => {
    await exigerRectifiable(tx, factureId);

    // Un paiement commence sur une facture annulee n'a plus d'objet.
    await tx.paiement.updateMany({
      where: { factureId, statut: "EN_ATTENTE" },
      data: { statut: "ECHOUE" },
    });

    return tx.facture.update({
      where: { id: factureId },
      data: {
        statut: "ANNULEE",
        motifRectification: motif,
        dateRectification: new Date(),
        rectifieePar: superviseurId,
      },
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Solde                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Ce qui reste dû sur une facture : le total moins les paiements **confirmés**.
 *
 * Un virement annoncé n'est pas un virement reçu ; tant qu'il est EN_ATTENTE il
 * ne réduit rien.
 */
export async function resteAPayer(db: Db, factureId: string): Promise<number> {
  const facture = await db.facture.findUnique({
    where: { id: factureId },
    select: { montantTotal: true, statut: true },
  });
  if (!facture) {
    throw new ErreurMetier("Cette facture n’existe pas.", 404);
  }
  if (facture.statut === "ANNULEE") return 0;

  const { _sum } = await db.paiement.aggregate({
    where: { factureId, statut: "CONFIRME" },
    _sum: { montant: true },
  });

  return Math.max(0, facture.montantTotal - (_sum.montant ?? 0));
}

/**
 * Restes à payer de plusieurs factures d'un coup.
 *
 * Une seule requête agrégée pour toute une liste : appeler `resteAPayer` dans
 * une boucle ferait N+1 allers-retours, ce qui se voit dès qu'un superviseur
 * ouvre une page de trente factures.
 */
export async function restesAPayer(
  db: Db,
  factures: ReadonlyArray<{ id: string; montantTotal: number }>,
): Promise<Map<string, number>> {
  if (factures.length === 0) return new Map();

  const regles = await db.paiement.groupBy({
    by: ["factureId"],
    where: {
      factureId: { in: factures.map((f) => f.id) },
      statut: "CONFIRME",
    },
    _sum: { montant: true },
  });

  const paye = new Map(regles.map((r) => [r.factureId, r._sum.montant ?? 0]));
  return new Map(
    factures.map((f) => [f.id, Math.max(0, f.montantTotal - (paye.get(f.id) ?? 0))]),
  );
}

/**
 * Passe la facture à PAYEE dès que les paiements confirmés couvrent le total.
 * Appelée après chaque confirmation, jamais depuis une route.
 */
async function reglerSiSoldee(db: Db, factureId: string) {
  const reste = await resteAPayer(db, factureId);
  if (reste > 0) return false;

  await db.facture.updateMany({
    where: { id: factureId, statut: "A_PAYER" },
    data: { statut: "PAYEE", datePaiement: new Date() },
  });
  return true;
}

/* -------------------------------------------------------------------------- */
/* Encaissement en especes                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The technician records cash taken on site.
 *
 * Confirmed on creation, because the money physically changed hands — there is
 * nothing left to wait for on the subscriber's side. What is *not* settled is
 * the company's side: `technicienId` is filled and `versementId` stays null,
 * which is precisely the definition of "the technician is holding company
 * money". `especesEnMain()` reads that state back.
 */
export async function encaisserEspeces({
  factureId,
  technicienId,
  montant,
}: {
  factureId: string;
  technicienId: string;
  montant: number;
}) {
  return prisma.$transaction(async (tx) => {
    const reste = await resteAPayer(tx, factureId);
    if (reste <= 0) {
      throw new ErreurMetier("Cette facture est déjà soldée.");
    }
    if (montant <= 0 || montant > reste) {
      throw new ErreurMetier(
        "Le montant encaissé doit être compris entre 1 millime et le reste à payer.",
        400,
      );
    }

    const paiement = await tx.paiement.create({
      data: {
        factureId,
        montant,
        moyen: "ESPECES",
        statut: "CONFIRME",
        reference: await referencePaiement(tx, "ESP"),
        technicienId,
        dateConfirmation: new Date(),
      },
    });

    await reglerSiSoldee(tx, factureId);
    return paiement;
  });
}

/* -------------------------------------------------------------------------- */
/* Paiement en ligne (passerelle simulee)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Online payment, in two steps, exactly as a real gateway works.
 *
 * `ouvrirPaiement` creates the intent and hands back a reference; the payment
 * screen then calls `confirmerPaiement` (or `echouerPaiement`) with it. No
 * gateway in this project actually moves money — Stripe does not serve Tunisian
 * merchants, and Paymee/Flouci need a signed contract this school project has
 * no way to obtain.
 *
 * The two-step shape is kept anyway, and it is the point: swapping the
 * simulation for a real provider means filling `confirmerPaiement` from a
 * webhook instead of from a button. Had the payment been recorded in one call,
 * the whole flow would have to be rewritten the day it becomes real.
 *
 * `reference` being `@unique` is what makes a replayed confirmation harmless.
 */
export async function ouvrirPaiement({
  factureId,
  moyen,
}: {
  factureId: string;
  moyen: string;
}) {
  if (
    !estMoyenPaiement(moyen) ||
    !(MOYENS_EN_LIGNE as readonly string[]).includes(moyen)
  ) {
    throw new ErreurMetier("Ce moyen de paiement n’est pas disponible en ligne.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const reste = await resteAPayer(tx, factureId);
    if (reste <= 0) {
      throw new ErreurMetier("Cette facture est déjà soldée.");
    }

    return tx.paiement.create({
      data: {
        factureId,
        montant: reste,
        moyen,
        statut: "EN_ATTENTE",
        reference: await referencePaiement(tx, "PAY"),
      },
    });
  });
}

/**
 * Confirme un paiement en ligne et solde la facture si le compte y est.
 *
 * Le virement reste volontairement EN_ATTENTE jusqu'à ce que le superviseur
 * confirme l'avoir vu sur le compte : annoncer un virement n'est pas le faire.
 */
export async function confirmerPaiement(
  reference: string,
  /**
   * Ce qui identifie le moyen sur le reçu, déjà composé par la route.
   * Jamais un numéro complet : voir le schéma.
   */
  detail?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const paiement = await tx.paiement.findUnique({
      where: { reference },
      select: { id: true, factureId: true, statut: true },
    });
    if (!paiement) {
      throw new ErreurMetier("Ce paiement n’existe pas.", 404);
    }
    if (paiement.statut === "CONFIRME") {
      // Rejeu : la passerelle peut notifier deux fois. Ne rien recompter.
      return paiement;
    }
    if (paiement.statut === "ECHOUE") {
      throw new ErreurMetier("Ce paiement a échoué, il faut en relancer un autre.");
    }

    await tx.paiement.update({
      where: { id: paiement.id },
      data: {
        statut: "CONFIRME",
        dateConfirmation: new Date(),
        ...(detail ? { detail } : {}),
      },
    });

    await reglerSiSoldee(tx, paiement.factureId);
    return paiement;
  });
}

export async function echouerPaiement(reference: string) {
  await prisma.paiement.updateMany({
    where: { reference, statut: "EN_ATTENTE" },
    data: { statut: "ECHOUE" },
  });
}

/* -------------------------------------------------------------------------- */
/* Versements : les especes remontent a la societe                            */
/* -------------------------------------------------------------------------- */

/** Espèces encaissées par un technicien et encore chez lui, en millimes. */
export async function especesEnMain(technicienId: string): Promise<number> {
  const { _sum } = await prisma.paiement.aggregate({
    where: {
      technicienId,
      moyen: "ESPECES",
      statut: "CONFIRME",
      versementId: null,
    },
    _sum: { montant: true },
  });
  return _sum.montant ?? 0;
}

/**
 * The technician declares having handed the cash over.
 *
 * Every cash payment still in hand is attached to the remittance at once, which
 * is why the amount is computed here and never sent by the client: a form field
 * would let a technician declare 200 DT while holding 400.
 *
 * The remittance is born EN_ATTENTE. Only the supervisor's acknowledgement
 * closes it — see `confirmerVersement`.
 */
export async function declarerVersement({
  technicienId,
  commentaire,
}: {
  technicienId: string;
  commentaire?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const enAttente = await tx.paiement.findMany({
      where: {
        technicienId,
        moyen: "ESPECES",
        statut: "CONFIRME",
        versementId: null,
      },
      select: { id: true, montant: true },
    });

    if (enAttente.length === 0) {
      throw new ErreurMetier("Vous n’avez aucune espèce à remettre.");
    }

    const montant = enAttente.reduce((somme, p) => somme + p.montant, 0);

    const versement = await tx.versement.create({
      data: {
        technicienId,
        montant,
        statut: "EN_ATTENTE",
        commentaire: commentaire ?? null,
      },
    });

    await tx.paiement.updateMany({
      where: { id: { in: enAttente.map((p) => p.id) } },
      data: { versementId: versement.id },
    });

    return versement;
  });
}

/** Le superviseur accuse réception des espèces. */
export async function confirmerVersement({
  versementId,
  superviseurId,
}: {
  versementId: string;
  superviseurId: string;
}) {
  const { count } = await prisma.versement.updateMany({
    where: { id: versementId, statut: "EN_ATTENTE" },
    data: {
      statut: "CONFIRME",
      dateConfirmation: new Date(),
      confirmePar: superviseurId,
    },
  });

  if (count === 0) {
    throw new ErreurMetier("Cette remise a déjà été confirmée.");
  }
}

/* -------------------------------------------------------------------------- */
/* Bilan pour le superviseur                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The company's money in four figures.
 *
 * `enAttente` is what has been billed and not collected — the only one of the
 * four that is a problem rather than a fact. `chezTechniciens` is a subset of
 * what *has* been collected: the subscriber has paid, the company has not yet
 * received it. Showing them apart is the whole point; a single "encaissé"
 * figure would hide the day a technician stops remitting.
 */
export async function bilanFinancier(periode?: { debut: Date; fin: Date }) {
  const filtreFacture = periode
    ? { dateEmission: { gte: periode.debut, lte: periode.fin } }
    : {};

  const [facture, encaisse, chezTechniciens, remisesAConfirmer, virementsAConfirmer] =
    await Promise.all([
      prisma.facture.aggregate({
        where: { statut: { not: "ANNULEE" }, ...filtreFacture },
        _sum: { montantTotal: true, montantTva: true },
      }),
      prisma.paiement.aggregate({
        where: { statut: "CONFIRME", facture: { ...filtreFacture } },
        _sum: { montant: true },
      }),
      prisma.paiement.aggregate({
        where: {
          statut: "CONFIRME",
          moyen: "ESPECES",
          versementId: null,
        },
        _sum: { montant: true },
      }),
      prisma.versement.aggregate({
        where: { statut: "EN_ATTENTE" },
        _sum: { montant: true },
        _count: true,
      }),
      prisma.paiement.aggregate({
        where: { statut: "EN_ATTENTE", moyen: "VIREMENT" },
        _sum: { montant: true },
        _count: true,
      }),
    ]);

  const totalFacture = facture._sum.montantTotal ?? 0;
  const totalEncaisse = encaisse._sum.montant ?? 0;

  return {
    /** Toutes taxes comprises : ce que les abonnés doivent. */
    facture: totalFacture,
    /** Collectée pour l'État, à reverser. */
    tvaCollectee: facture._sum.montantTva ?? 0,
    encaisse: totalEncaisse,
    enAttente: Math.max(0, totalFacture - totalEncaisse),
    chezTechniciens: chezTechniciens._sum.montant ?? 0,
    remisesAConfirmer: {
      nombre: remisesAConfirmer._count,
      montant: remisesAConfirmer._sum.montant ?? 0,
    },
    virementsAConfirmer: {
      nombre: virementsAConfirmer._count,
      montant: virementsAConfirmer._sum.montant ?? 0,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Lectures partagees                                                         */
/* -------------------------------------------------------------------------- */

/** Tout ce qu'il faut pour afficher une facture et son reçu. */
export const selectionFacture = {
  id: true,
  numero: true,
  montantHT: true,
  tauxTva: true,
  montantTva: true,
  timbreFiscal: true,
  montantTotal: true,
  statut: true,
  dateEmission: true,
  datePaiement: true,
  motifRectification: true,
  dateRectification: true,
  lignes: { select: { id: true, designation: true, montant: true } },
  paiements: {
    select: {
      id: true,
      montant: true,
      moyen: true,
      statut: true,
      reference: true,
      detail: true,
      dateCreation: true,
      dateConfirmation: true,
      technicien: {
        select: {
          matricule: true,
          utilisateur: { select: { nom: true, prenom: true } },
        },
      },
    },
    orderBy: { dateCreation: "asc" },
  },
} satisfies Prisma.FactureSelect;

export type FactureDetail = Prisma.FactureGetPayload<{
  select: typeof selectionFacture;
}>;

/* -------------------------------------------------------------------------- */
/* Controles de propriete                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Ownership checks, re-done in every route.
 *
 * The proxy filters URLs by role; it cannot tell whose invoice `/api/factures/
 * abc123/payer` is. Without these, any signed-in subscriber could read a
 * neighbour's invoice — amount, fault type, technician — by guessing an id.
 */
export async function exigerFactureDuClient(factureId: string, clientId: string) {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    select: {
      id: true,
      statut: true,
      montantTotal: true,
      intervention: { select: { clientId: true } },
    },
  });

  if (!facture || facture.intervention.clientId !== clientId) {
    throw new ErreurMetier("Cette facture n’existe pas.", 404);
  }
  return facture;
}

/** Le technicien n'encaisse que les factures des interventions qu'il a faites. */
export async function exigerFactureDuTechnicien(
  factureId: string,
  technicienId: string,
) {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    select: {
      id: true,
      statut: true,
      montantTotal: true,
      intervention: { select: { technicienId: true } },
    },
  });

  if (!facture) {
    throw new ErreurMetier("Cette facture n’existe pas.", 404);
  }
  if (facture.intervention.technicienId !== technicienId) {
    throw new ErreurMetier(
      "Cette facture concerne l’intervention d’un autre technicien.",
      403,
    );
  }
  return facture;
}
