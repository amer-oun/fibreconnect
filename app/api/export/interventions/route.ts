import { prisma } from "@/lib/prisma";
import { exigerRoleApi, traiterErreur } from "@/lib/api";
import { construireFiltreIntervention } from "@/lib/filtres";
import {
  PRIORITE_LABELS,
  STATUT_LABELS,
  TYPE_PANNE_LABELS,
  type Priorite,
  type Statut,
  type TypePanne,
} from "@/lib/constants";
import { formaterDateHeure } from "@/lib/dates";
import { construireCsv } from "@/lib/csv";

/**
 * CSV export of the intervention list, honouring the filters currently applied.
 *
 * Dates are written already formatted, so no locale re-interpretation happens
 * on the way in. Everything else about the format lives in `lib/csv.ts`.
 */

const ENTETES = [
  "Référence",
  "Statut",
  "Priorité",
  "Type de panne",
  "Réseau",
  "Abonné",
  "Ville",
  "Contrat",
  "Technicien",
  "Matricule",
  "Déclarée le",
  "Démarrée le",
  "Clôturée le",
  "Note",
  "Rapport",
];

export async function GET(requete: Request) {
  try {
    await exigerRoleApi("SUPERVISEUR");

    const parametres = Object.fromEntries(
      new URL(requete.url).searchParams.entries(),
    );

    const interventions = await prisma.intervention.findMany({
      where: construireFiltreIntervention(parametres),
      orderBy: { dateCreation: "desc" },
      select: {
        id: true,
        statut: true,
        priorite: true,
        typePanne: true,
        dateCreation: true,
        dateDebut: true,
        dateFin: true,
        noteClient: true,
        rapport: true,
        client: {
          select: {
            ville: true,
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
    });

    const lignes = interventions.map((i) => [
        i.id.slice(-6).toUpperCase(),
        STATUT_LABELS[i.statut as Statut] ?? i.statut,
        PRIORITE_LABELS[i.priorite as Priorite] ?? i.priorite,
        TYPE_PANNE_LABELS[i.typePanne as TypePanne] ?? i.typePanne,
        i.client.operateur.nom,
        `${i.client.utilisateur.prenom} ${i.client.utilisateur.nom}`,
        i.client.ville,
        i.client.numContrat,
        i.technicien
          ? `${i.technicien.utilisateur.prenom} ${i.technicien.utilisateur.nom}`
          : "",
        i.technicien?.matricule ?? "",
        formaterDateHeure(i.dateCreation),
        i.dateDebut ? formaterDateHeure(i.dateDebut) : "",
        i.dateFin ? formaterDateHeure(i.dateFin) : "",
        i.noteClient ?? "",
        i.rapport ?? "",
    ]);

    const jour = new Date().toISOString().slice(0, 10);

    return new Response(construireCsv(ENTETES, lignes), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="interventions-${jour}.csv"`,
        // Un export reflète l'instant où on le demande : jamais de cache.
        "Cache-Control": "no-store",
      },
    });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
