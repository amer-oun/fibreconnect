import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { preparerBase, semerJeuDeTest, supprimerBase } from "./aide";
import { prisma as client } from "@/lib/prisma";
import { ErreurMetier, changerStatut, creerIntervention } from "@/lib/interventions";
import {
  annulerFacture,
  bilanFinancier,
  confirmerPaiement,
  corrigerFacture,
  confirmerVersement,
  declarerVersement,
  echouerPaiement,
  emettreFacture,
  encaisserEspeces,
  especesEnMain,
  ouvrirPaiement,
  resteAPayer,
} from "@/lib/facturation";
import {
  TARIFS,
  TIMBRE_FISCAL,
  TVA_TAUX,
  totauxFacture,
} from "@/lib/constants";
import { dinarsEnMillimes, formaterMontant, partDe } from "@/lib/monnaie";

/** Le TTC correspondant à un hors-taxes, comme le calcule l'application. */
const ttc = (ht: number) => totauxFacture([{ montant: ht }]).montantTotal;

/**
 * Invoicing and settlement, against a real database.
 *
 * The point of these tests is not that additions work: it is that money cannot
 * be created or lost by the paths the application offers — no double counting
 * on a replayed confirmation, no invoice settled by an unconfirmed transfer,
 * no cash that stops being owed without someone acknowledging it.
 */

type Prisma = Awaited<ReturnType<typeof preparerBase>>;
type Jeu = Awaited<ReturnType<typeof semerJeuDeTest>>;

let prisma: Prisma;
let jeu: Jeu;

beforeAll(async () => {
  prisma = await preparerBase();
  jeu = await semerJeuDeTest(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  supprimerBase();
});

/** Une intervention terminée par un technicien (A par défaut), avec sa facture. */
async function interventionFacturee(options?: {
  typePanne?: string;
  pieces?: { designation: string; montant: number }[];
  technicien?: { id: string };
}) {
  const typePanne = options?.typePanne ?? "COUPURE_TOTALE";
  const technicienId = options?.technicien?.id ?? jeu.techA.id;

  const intervention = await creerIntervention({
    clientId: jeu.clientA.id,
    typePanne,
    priorite: "NORMALE",
    description: "Coupure totale de la ligne depuis ce matin, voyant rouge.",
  });

  await changerStatut({
    interventionId: intervention.id,
    vers: "ASSIGNEE",
    action: "ACCEPTATION",
    technicienId,
    champs: { technicien: { connect: { id: technicienId } } },
  });
  await changerStatut({
    interventionId: intervention.id,
    vers: "EN_COURS",
    action: "DEMARRAGE",
    technicienId,
    champs: { dateDebut: new Date() },
  });

  let factureId = "";
  await changerStatut({
    interventionId: intervention.id,
    vers: "TERMINEE",
    action: "CLOTURE",
    technicienId,
    champs: { dateFin: new Date(), rapport: "Connecteur nettoyé, ligne rétablie." },
    apres: async (tx) => {
      const facture = await emettreFacture(tx, {
        interventionId: intervention.id,
        typePanne,
        pieces: options?.pieces,
      });
      factureId = facture.id;
    },
  });

  return { intervention, factureId };
}

describe("Émission de la facture", () => {
  it("facture le tarif du type de panne, sur une ligne nommée", async () => {
    const { factureId } = await interventionFacturee();
    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
      include: { lignes: true },
    });

    expect(facture.montantHT).toBe(TARIFS.COUPURE_TOTALE);
    expect(facture.lignes).toHaveLength(1);
    expect(facture.lignes[0].designation).toContain("Coupure totale");
    expect(facture.statut).toBe("A_PAYER");
  });

  it("ajoute la TVA et le droit de timbre au hors-taxes", async () => {
    const { factureId } = await interventionFacturee();
    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
    });

    expect(facture.tauxTva).toBe(TVA_TAUX);
    expect(facture.timbreFiscal).toBe(TIMBRE_FISCAL);
    expect(facture.montantTva).toBe(partDe(facture.montantHT, TVA_TAUX));
    // C'est le TTC que l'abonné doit, et donc celui que le règlement solde.
    expect(facture.montantTotal).toBe(
      facture.montantHT + facture.montantTva + facture.timbreFiscal,
    );
    expect(await resteAPayer(client, factureId)).toBe(facture.montantTotal);
  });

  it("fige le taux et le timbre sur la facture, sans les relire ensuite", async () => {
    const { factureId } = await interventionFacturee();
    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
    });

    // Un taux qui changerait par décision budgétaire ne doit pas réécrire les
    // factures déjà émises : elles portent leur propre taux.
    expect(facture).toHaveProperty("tauxTva");
    expect(facture).toHaveProperty("timbreFiscal");
    expect(facture.montantTotal).toBe(
      facture.montantHT + partDe(facture.montantHT, facture.tauxTva) + facture.timbreFiscal,
    );
  });

  it("ajoute les pièces sur leurs propres lignes et les additionne", async () => {
    const { factureId } = await interventionFacturee({
      typePanne: "ONT_DEFECTUEUX",
      pieces: [
        { designation: "ONT de remplacement", montant: dinarsEnMillimes(85) },
        { designation: "Jarretière SC/APC", montant: dinarsEnMillimes(18.5) },
      ],
    });

    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
      include: { lignes: true },
    });

    expect(facture.lignes).toHaveLength(3);
    // Le hors-taxes est exactement la somme des lignes affichées : c'est toute
    // la raison d'utiliser des entiers de millimes.
    expect(facture.montantHT).toBe(TARIFS.ONT_DEFECTUEUX + 85_000 + 18_500);
    expect(facture.montantHT).toBe(
      facture.lignes.reduce((s, l) => s + l.montant, 0),
    );
  });

  it("porte un numéro lisible et unique", async () => {
    const a = await interventionFacturee();
    const b = await interventionFacturee();

    const [fa, fb] = await Promise.all([
      prisma.facture.findUniqueOrThrow({ where: { id: a.factureId } }),
      prisma.facture.findUniqueOrThrow({ where: { id: b.factureId } }),
    ]);

    expect(fa.numero).toMatch(/^FC-\d{4}-\d{4}$/);
    expect(fb.numero).not.toBe(fa.numero);
  });

  it("refuse une deuxième facture pour la même intervention", async () => {
    const { intervention } = await interventionFacturee();

    await expect(
      emettreFacture(client, {
        interventionId: intervention.id,
        typePanne: "COUPURE_TOTALE",
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("annule la clôture si la facture échoue — jamais de travaux sans facture", async () => {
    const intervention = await creerIntervention({
      clientId: jeu.clientA.id,
      typePanne: "DEBIT_FAIBLE",
      priorite: "NORMALE",
      description: "Débit très faible depuis plusieurs jours, surtout le soir.",
    });
    await changerStatut({
      interventionId: intervention.id,
      vers: "ASSIGNEE",
      action: "ACCEPTATION",
      technicienId: jeu.techA.id,
    });
    await changerStatut({
      interventionId: intervention.id,
      vers: "EN_COURS",
      action: "DEMARRAGE",
      technicienId: jeu.techA.id,
    });

    await expect(
      changerStatut({
        interventionId: intervention.id,
        vers: "TERMINEE",
        action: "CLOTURE",
        technicienId: jeu.techA.id,
        champs: { dateFin: new Date(), rapport: "Rapport de clôture." },
        apres: async () => {
          throw new ErreurMetier("Panne de facturation simulée.");
        },
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);

    const apres = await prisma.intervention.findUniqueOrThrow({
      where: { id: intervention.id },
    });
    expect(apres.statut).toBe("EN_COURS");
  });
});

describe("Paiement en ligne", () => {
  it("ne solde rien tant que le paiement n'est pas confirmé", async () => {
    const { factureId } = await interventionFacturee();
    await ouvrirPaiement({ factureId, moyen: "VIREMENT" });

    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
    });
    expect(facture.statut).toBe("A_PAYER");
    expect(await resteAPayer(client, factureId)).toBe(ttc(TARIFS.COUPURE_TOTALE));
  });

  it("solde la facture à la confirmation", async () => {
    const { factureId } = await interventionFacturee();
    const paiement = await ouvrirPaiement({ factureId, moyen: "CARTE" });
    await confirmerPaiement(paiement.reference);

    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
    });
    expect(facture.statut).toBe("PAYEE");
    expect(facture.datePaiement).not.toBeNull();
    expect(await resteAPayer(client, factureId)).toBe(0);
  });

  it("ne compte pas deux fois une confirmation rejouée", async () => {
    const { factureId } = await interventionFacturee();
    const paiement = await ouvrirPaiement({ factureId, moyen: "D17" });

    await confirmerPaiement(paiement.reference);
    await confirmerPaiement(paiement.reference);
    await confirmerPaiement(paiement.reference);

    const paiements = await prisma.paiement.findMany({ where: { factureId } });
    expect(paiements).toHaveLength(1);
    expect(await resteAPayer(client, factureId)).toBe(0);
  });

  it("refuse un paiement en ligne en espèces", async () => {
    const { factureId } = await interventionFacturee();
    await expect(
      ouvrirPaiement({ factureId, moyen: "ESPECES" }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("laisse la facture à payer quand le paiement échoue", async () => {
    const { factureId } = await interventionFacturee();
    const paiement = await ouvrirPaiement({ factureId, moyen: "CARTE" });
    await echouerPaiement(paiement.reference);

    expect(await resteAPayer(client, factureId)).toBe(ttc(TARIFS.COUPURE_TOTALE));
    await expect(
      confirmerPaiement(paiement.reference),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("refuse d'ouvrir un paiement sur une facture déjà soldée", async () => {
    const { factureId } = await interventionFacturee();
    const paiement = await ouvrirPaiement({ factureId, moyen: "CARTE" });
    await confirmerPaiement(paiement.reference);

    await expect(
      ouvrirPaiement({ factureId, moyen: "CARTE" }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });
});

describe("Espèces et dette du technicien", () => {
  it("encaisser des espèces solde la facture et crée la dette", async () => {
    const avant = await especesEnMain(jeu.techA.id);
    const { factureId } = await interventionFacturee();

    await encaisserEspeces({
      factureId,
      technicienId: jeu.techA.id,
      montant: ttc(TARIFS.COUPURE_TOTALE),
    });

    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
    });
    expect(facture.statut).toBe("PAYEE");
    expect(await especesEnMain(jeu.techA.id)).toBe(
      avant + ttc(TARIFS.COUPURE_TOTALE),
    );
  });

  it("accepte un paiement partiel sans solder la facture", async () => {
    const { factureId } = await interventionFacturee();
    const moitie = Math.round(ttc(TARIFS.COUPURE_TOTALE) / 2);

    await encaisserEspeces({
      factureId,
      technicienId: jeu.techA.id,
      montant: moitie,
    });

    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
    });
    expect(facture.statut).toBe("A_PAYER");
    expect(await resteAPayer(client, factureId)).toBe(moitie);
  });

  it("refuse d'encaisser plus que le reste dû", async () => {
    const { factureId } = await interventionFacturee();

    await expect(
      encaisserEspeces({
        factureId,
        technicienId: jeu.techA.id,
        montant: ttc(TARIFS.COUPURE_TOTALE) + 1,
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("une remise éteint la dette, et seule la confirmation la clôt", async () => {
    const { factureId } = await interventionFacturee();
    await encaisserEspeces({
      factureId,
      technicienId: jeu.techB.id,
      montant: ttc(TARIFS.COUPURE_TOTALE),
    });

    const detenu = await especesEnMain(jeu.techB.id);
    expect(detenu).toBeGreaterThan(0);

    const versement = await declarerVersement({ technicienId: jeu.techB.id });
    expect(versement.montant).toBe(detenu);
    expect(versement.statut).toBe("EN_ATTENTE");
    // Declaree, donc plus « en main » : elle est desormais suivie par la remise.
    expect(await especesEnMain(jeu.techB.id)).toBe(0);

    await confirmerVersement({
      versementId: versement.id,
      superviseurId: "superviseur-de-test",
    });
    const confirme = await prisma.versement.findUniqueOrThrow({
      where: { id: versement.id },
    });
    expect(confirme.statut).toBe("CONFIRME");
    expect(confirme.dateConfirmation).not.toBeNull();

    // Deux confirmations ne se produisent pas : la remise n'est plus en attente.
    await expect(
      confirmerVersement({
        versementId: versement.id,
        superviseurId: "superviseur-de-test",
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("refuse une remise quand il n'y a rien à remettre", async () => {
    await expect(
      declarerVersement({ technicienId: jeu.techB.id }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });
});

describe("Rectification d'une facture", () => {
  const SUPERVISEUR = "superviseur-de-test";

  it("corrige les lignes et recalcule le total", async () => {
    const { factureId } = await interventionFacturee({
      typePanne: "CHANGEMENT_ROUTEUR",
      // La faute de frappe qui justifie tout ce mécanisme : 2100 DT au lieu
      // de 210 DT, sur une facture que l'abonné reçoit telle quelle.
      pieces: [{ designation: "Routeur Wi-Fi 6", montant: 2_100_000 }],
    });

    const avant = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
    });
    expect(avant.montantHT).toBe(TARIFS.CHANGEMENT_ROUTEUR + 2_100_000);

    const apres = await corrigerFacture({
      factureId,
      superviseurId: SUPERVISEUR,
      motif: "Routeur facturé 2100 DT au lieu de 210 DT.",
      lignes: [
        { designation: "Déplacement et main-d’œuvre", montant: TARIFS.CHANGEMENT_ROUTEUR },
        { designation: "Routeur Wi-Fi 6", montant: 210_000 },
      ],
    });

    expect(apres.lignes).toHaveLength(2);
    expect(apres.montantHT).toBe(TARIFS.CHANGEMENT_ROUTEUR + 210_000);
    expect(apres.montantHT).toBe(
      apres.lignes.reduce((s, l) => s + l.montant, 0),
    );
    // La correction recalcule aussi les taxes : un total corrigé qui garderait
    // la TVA de l'ancien montant ne serait pas rapprochable.
    expect(apres.montantTva).toBe(partDe(apres.montantHT, apres.tauxTva));
    expect(apres.montantTotal).toBe(
      apres.montantHT + apres.montantTva + apres.timbreFiscal,
    );
    expect(apres.motifRectification).toContain("2100 DT");
    expect(apres.rectifieePar).toBe(SUPERVISEUR);
    expect(await resteAPayer(client, factureId)).toBe(apres.montantTotal);
  });

  it("ne laisse pas une facture sans ligne", async () => {
    const { factureId } = await interventionFacturee();

    await expect(
      corrigerFacture({
        factureId,
        superviseurId: SUPERVISEUR,
        motif: "Tentative de facture vide.",
        lignes: [],
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("annule une facture, éteint le reste dû et fait échouer le paiement en cours", async () => {
    const { factureId } = await interventionFacturee();
    const paiement = await ouvrirPaiement({ factureId, moyen: "VIREMENT" });

    await annulerFacture({
      factureId,
      superviseurId: SUPERVISEUR,
      motif: "Intervention sous garantie, aucun montant dû.",
    });

    const facture = await prisma.facture.findUniqueOrThrow({
      where: { id: factureId },
    });
    expect(facture.statut).toBe("ANNULEE");
    expect(facture.motifRectification).toContain("garantie");
    expect(await resteAPayer(client, factureId)).toBe(0);

    // Un virement annoncé sur une facture annulée n'a plus d'objet.
    const regle = await prisma.paiement.findUniqueOrThrow({
      where: { reference: paiement.reference },
    });
    expect(regle.statut).toBe("ECHOUE");
  });

  it("refuse de rectifier ce qui a déjà été payé, même en partie", async () => {
    const { factureId } = await interventionFacturee();
    await encaisserEspeces({
      factureId,
      technicienId: jeu.techA.id,
      montant: Math.round(ttc(TARIFS.COUPURE_TOTALE) / 2),
    });

    // Deplacer le total sous les pieds de quelqu'un qui a deja paye une moitie
    // produit un chiffre qu'aucune des deux parties ne peut rapprocher.
    await expect(
      corrigerFacture({
        factureId,
        superviseurId: SUPERVISEUR,
        motif: "Tentative après règlement partiel.",
        lignes: [{ designation: "Autre montant", montant: 10_000 }],
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);

    await expect(
      annulerFacture({
        factureId,
        superviseurId: SUPERVISEUR,
        motif: "Tentative après règlement partiel.",
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("refuse de rectifier une facture soldée ou déjà annulée", async () => {
    const soldee = await interventionFacturee();
    const paiement = await ouvrirPaiement({
      factureId: soldee.factureId,
      moyen: "CARTE",
    });
    await confirmerPaiement(paiement.reference);

    await expect(
      annulerFacture({
        factureId: soldee.factureId,
        superviseurId: SUPERVISEUR,
        motif: "Tentative sur facture soldée.",
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);

    const annulee = await interventionFacturee();
    await annulerFacture({
      factureId: annulee.factureId,
      superviseurId: SUPERVISEUR,
      motif: "Geste commercial accordé à l’abonné.",
    });
    await expect(
      annulerFacture({
        factureId: annulee.factureId,
        superviseurId: SUPERVISEUR,
        motif: "Deuxième tentative sur la même facture.",
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("sort une facture annulée du chiffre d'affaires", async () => {
    const avant = await bilanFinancier();
    const { factureId } = await interventionFacturee();
    const montant = (
      await prisma.facture.findUniqueOrThrow({ where: { id: factureId } })
    ).montantTotal;

    const pendant = await bilanFinancier();
    expect(pendant.facture).toBe(avant.facture + montant);

    await annulerFacture({
      factureId,
      superviseurId: SUPERVISEUR,
      motif: "Facture émise par erreur sur cette intervention.",
    });

    const apres = await bilanFinancier();
    expect(apres.facture).toBe(avant.facture);
  });
});

describe("Bilan de la société", () => {
  it("sépare ce qui est encaissé de ce qui dort chez les techniciens", async () => {
    const bilan = await bilanFinancier();

    expect(bilan.facture).toBeGreaterThan(0);
    expect(bilan.encaisse).toBeLessThanOrEqual(bilan.facture);
    expect(bilan.enAttente).toBe(bilan.facture - bilan.encaisse);
    // Les especes detenues font partie de l'encaisse : l'abonne a paye, la
    // societe ne l'a pas encore recu. Les confondre masquerait le jour ou un
    // technicien cesse de reverser.
    expect(bilan.chezTechniciens).toBeLessThanOrEqual(bilan.encaisse);
  });
});

describe("Montants", () => {
  it("affiche toujours trois décimales, comme le dinar", () => {
    expect(formaterMontant(105_500)).toMatch(/105,500\s*DT/);
    expect(formaterMontant(80_000)).toMatch(/80,000\s*DT/);
    expect(formaterMontant(0)).toMatch(/0,000\s*DT/);
  });

  it("convertit une saisie en dinars sans dérive", () => {
    expect(dinarsEnMillimes(18.5)).toBe(18_500);
    expect(dinarsEnMillimes(0.1) + dinarsEnMillimes(0.2)).toBe(300);
  });

  it("arrondit une part au millime", () => {
    expect(partDe(105_500, 0.19)).toBe(20_045);
    expect(Number.isInteger(partDe(333_333, 0.19))).toBe(true);
  });
});
