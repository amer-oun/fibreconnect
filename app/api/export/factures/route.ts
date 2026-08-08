import { prisma } from "@/lib/prisma";
import { exigerRoleApi, traiterErreur } from "@/lib/api";
import { restesAPayer } from "@/lib/facturation";
import { montantPourTableur } from "@/lib/monnaie";
import {
  STATUTS_FACTURE,
  STATUT_FACTURE_LABELS,
  TYPE_PANNE_LABELS,
  libelleMoyenPaiement,
  type StatutFacture,
  type TypePanne,
} from "@/lib/constants";
import { formaterDateHeure } from "@/lib/dates";
import { construireCsv } from "@/lib/csv";

/**
 * The invoice register, as a spreadsheet.
 *
 * This is the document an accountant asks for at the end of the month, so it is
 * a *register*: one line per invoice, in issue order, oldest first. Not the
 * screen order — a ledger reads forward in time.
 *
 * Amounts go out as bare numbers with a decimal comma (see
 * `montantPourTableur`): a "Montant" column that will not add up is worthless.
 * Dates go out already formatted, so no locale re-interpretation happens on the
 * way in.
 */

const ENTETES = [
  "Numéro",
  "Émise le",
  "Statut",
  "Abonné",
  "Contrat",
  "Ville",
  "Zone",
  "Réseau",
  "Type de panne",
  "Technicien",
  "Matricule",
  "Montant total",
  "Réglé",
  "Reste dû",
  "Moyens de règlement",
  "Soldée le",
  "Rectification",
];

export async function GET(requete: Request) {
  try {
    await exigerRoleApi("SUPERVISEUR");

    const parametres = new URL(requete.url).searchParams;
    const statut = parametres.get("statut");
    const filtreStatut =
      statut && (STATUTS_FACTURE as readonly string[]).includes(statut)
        ? { statut }
        : {};

    const factures = await prisma.facture.findMany({
      where: filtreStatut,
      // Ordre du registre : de la plus ancienne à la plus récente.
      orderBy: { dateEmission: "asc" },
      select: {
        id: true,
        numero: true,
        montantTotal: true,
        statut: true,
        dateEmission: true,
        datePaiement: true,
        motifRectification: true,
        paiements: {
          select: { moyen: true, montant: true, statut: true },
          orderBy: { dateCreation: "asc" },
        },
        intervention: {
          select: {
            typePanne: true,
            client: {
              select: {
                ville: true,
                zone: true,
                numContrat: true,
                operateur: { select: { nom: true } },
                utilisateur: { select: { nom: true, prenom: true } },
              },
            },
            technicien: {
              select: {
                matricule: true,
                utilisateur: { select: { nom: true, prenom: true } },
              },
            },
          },
        },
      },
    });

    const soldes = await restesAPayer(prisma, factures);

    const lignes = factures.map((f) => {
      const confirmes = f.paiements.filter((p) => p.statut === "CONFIRME");
      const regle = confirmes.reduce((s, p) => s + p.montant, 0);
      const { client, technicien } = f.intervention;

      return [
        f.numero,
        formaterDateHeure(f.dateEmission),
        STATUT_FACTURE_LABELS[f.statut as StatutFacture] ?? f.statut,
        `${client.utilisateur.prenom} ${client.utilisateur.nom}`,
        client.numContrat,
        client.ville,
        client.zone,
        client.operateur.nom,
        TYPE_PANNE_LABELS[f.intervention.typePanne as TypePanne] ??
          f.intervention.typePanne,
        technicien
          ? `${technicien.utilisateur.prenom} ${technicien.utilisateur.nom}`
          : "",
        technicien?.matricule ?? "",
        montantPourTableur(f.montantTotal),
        montantPourTableur(regle),
        montantPourTableur(
          f.statut === "ANNULEE" ? 0 : (soldes.get(f.id) ?? 0),
        ),
        // Les doublons disparaissent : « Espèces, Espèces » n'apprend rien de
        // plus que « Espèces » sur la façon dont la facture a été réglée.
        [...new Set(confirmes.map((p) => libelleMoyenPaiement(p.moyen)))].join(
          " + ",
        ),
        f.datePaiement ? formaterDateHeure(f.datePaiement) : "",
        f.motifRectification ?? "",
      ];
    });

    const jour = new Date().toISOString().slice(0, 10);
    // Le nom du fichier dit ce qu'il contient : deux exports du meme jour ne
    // doivent pas atterrir dans le meme dossier sous le meme nom.
    const portee = statut === "A_PAYER" ? "factures-impayees" : "factures";

    return new Response(construireCsv(ENTETES, lignes), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${portee}-${jour}.csv"`,
        // Un export reflète l'instant où on le demande : jamais de cache.
        "Cache-Control": "no-store",
      },
    });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
