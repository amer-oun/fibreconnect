import type { Prisma } from "@prisma/client";

import {
  DELAIS_PRISE_EN_CHARGE,
  PRIORITES,
  PRIORITE_LABELS,
  STATUTS,
  STATUT_LABELS,
  TYPES_PANNE,
  TYPE_PANNE_LABELS,
  ZONES,
} from "@/lib/constants";

/**
 * Turns URL search params into a Prisma `where` clause.
 *
 * Only values that exist in the constants are accepted, so a hand-edited URL
 * cannot inject anything into the query.
 */

export type ParametresRecherche = Record<string, string | string[] | undefined>;

function valeur(parametres: ParametresRecherche, cle: string) {
  const brut = parametres[cle];
  return typeof brut === "string" ? brut.trim() : "";
}

/**
 * Faults still waiting for a technician past their pick-up target.
 *
 * Expressed as a `where` clause rather than filtered in JavaScript, so the
 * count on the dashboard and the list behind it come from the same query — and
 * so paging never loses a late one that happened to fall on page two.
 *
 * One branch per priority, because each has its own deadline; SQLite turns the
 * `OR` into four indexed range scans on `dateCreation`.
 */
export function conditionHorsDelai(
  maintenant: Date = new Date(),
): Prisma.InterventionWhereInput {
  return {
    statut: "NOUVELLE",
    OR: PRIORITES.map((priorite) => ({
      priorite,
      dateCreation: {
        lt: new Date(
          maintenant.getTime() - DELAIS_PRISE_EN_CHARGE[priorite] * 3_600_000,
        ),
      },
    })),
  };
}

export function construireFiltreIntervention(
  parametres: ParametresRecherche,
): Prisma.InterventionWhereInput {
  const conditions: Prisma.InterventionWhereInput[] = [];

  // Filtre transverse : « hors délai » n'est pas un statut, c'est une lecture
  // du couple priorité / ancienneté.
  if (valeur(parametres, "retard") === "1") {
    conditions.push(conditionHorsDelai());
  }

  const statut = valeur(parametres, "statut");
  if ((STATUTS as readonly string[]).includes(statut)) {
    conditions.push({ statut });
  }

  const priorite = valeur(parametres, "priorite");
  if ((PRIORITES as readonly string[]).includes(priorite)) {
    conditions.push({ priorite });
  }

  const type = valeur(parametres, "type");
  if ((TYPES_PANNE as readonly string[]).includes(type)) {
    conditions.push({ typePanne: type });
  }

  const operateur = valeur(parametres, "operateur");
  if (operateur) {
    conditions.push({ client: { operateurId: operateur } });
  }

  const zone = valeur(parametres, "zone");
  if ((ZONES as readonly string[]).includes(zone)) {
    conditions.push({ client: { zone } });
  }

  const q = valeur(parametres, "q");
  if (q) {
    // SQLite ne gere pas `mode: "insensitive"` : on compare en minuscules via
    // une recherche sur plusieurs colonnes, ce qui suffit a ce volume.
    conditions.push({
      OR: [
        { description: { contains: q } },
        { rapport: { contains: q } },
        { client: { ville: { contains: q } } },
        { client: { zone: { contains: q } } },
        { client: { adresse: { contains: q } } },
        { client: { numContrat: { contains: q } } },
        { client: { utilisateur: { nom: { contains: q } } } },
        { client: { utilisateur: { prenom: { contains: q } } } },
        { technicien: { matricule: { contains: q } } },
        { technicien: { utilisateur: { nom: { contains: q } } } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

/** Options prêtes à passer à `BarreFiltres`. */
export const OPTIONS_STATUT = STATUTS.map((s) => ({
  valeur: s,
  libelle: STATUT_LABELS[s],
}));

export const OPTIONS_PRIORITE = PRIORITES.map((p) => ({
  valeur: p,
  libelle: PRIORITE_LABELS[p],
}));

export const OPTIONS_TYPE_PANNE = TYPES_PANNE.map((t) => ({
  valeur: t,
  libelle: TYPE_PANNE_LABELS[t],
}));

export const OPTIONS_ZONE_FILTRE = ZONES.map((z) => ({
  valeur: z,
  libelle: z,
}));

/**
 * Un seul choix, volontairement : la question posée est « montre-moi ce qui a
 * dépassé son délai », pas « classe-moi les interventions par délai ». Une
 * liste à deux entrées dont l'une signifie « tout » n'apprendrait rien.
 */
export const OPTIONS_RETARD = [{ valeur: "1", libelle: "Hors délai" }];
