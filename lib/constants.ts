/**
 * Single source of truth for every value stored as a plain `String` in the database.
 *
 * SQLite does not support Prisma `enum`, so `role`, `statut`, `priorite` and
 * `typePanne` are `String` columns. The allowed values live here as `as const`
 * tuples, the TypeScript types are derived from them, and every write path
 * validates against them (zod uses `z.enum(STATUTS)` and friends).
 *
 * Adding a value = adding it to the tuple AND to its label map. TypeScript
 * fails the build if a label is missing.
 */

/* -------------------------------------------------------------------------- */
/* Roles                                                                      */
/* -------------------------------------------------------------------------- */

export const ROLES = ["CLIENT", "TECHNICIEN", "SUPERVISEUR"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  CLIENT: "Client",
  TECHNICIEN: "Technicien",
  SUPERVISEUR: "Superviseur",
};

/** Page d'accueil de chaque role apres connexion. */
export const ROLE_ACCUEIL: Record<Role, string> = {
  CLIENT: "/client/dashboard",
  TECHNICIEN: "/technicien/dashboard",
  SUPERVISEUR: "/superviseur/dashboard",
};

/* -------------------------------------------------------------------------- */
/* Etat d'un compte                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Account state, replacing the former `actif` boolean.
 *
 * A boolean could not tell "never validated yet" from "shut down by the
 * supervisor" — two situations that call for different words on screen and,
 * for the first one, a validation screen. Both refuse the sign-in all the same.
 */
export const STATUTS_COMPTE = ["ACTIF", "EN_ATTENTE", "DESACTIVE"] as const;
export type StatutCompte = (typeof STATUTS_COMPTE)[number];

export const STATUT_COMPTE_LABELS: Record<StatutCompte, string> = {
  ACTIF: "Actif",
  EN_ATTENTE: "En attente de validation",
  DESACTIVE: "Désactivé",
};

/** Seul un compte ACTIF peut se connecter (regle metier 6). */
export function peutSeConnecter(statutCompte: string) {
  return statutCompte === "ACTIF";
}

export const STATUT_COMPTE_COULEURS: Record<StatutCompte, string> = {
  ACTIF: "bg-green-50 text-green-800 border-green-300",
  EN_ATTENTE: "bg-amber-50 text-amber-800 border-amber-300",
  DESACTIVE: "bg-red-50 text-red-800 border-red-300",
};

/* -------------------------------------------------------------------------- */
/* Zones d'intervention                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Geographic zones — the heart of the dispatch rule.
 *
 * A technician is an employee of FibreConnect, not of a network operator, so
 * what decides which faults reach them is *where they work*, not whose cable
 * it is. `client.zone === technicien.zone` is the filter the whole technician
 * dashboard rests on.
 *
 * Deliberately a closed list of governorates rather than the free-text `ville`.
 * Comparing towns would leave a subscriber in "La Marsa" invisible to the
 * technician covering "Tunis", and a single typo would hide a fault from
 * everyone — silently, which is the worst way for a dispatch rule to fail.
 */
export const ZONES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Bizerte",
  "Sousse",
  "Monastir",
  "Sfax",
] as const;
export type Zone = (typeof ZONES)[number];

export function estZone(valeur: string): valeur is Zone {
  return (ZONES as readonly string[]).includes(valeur);
}

/** Options prêtes pour un `<select>`. Le libellé est le nom de la zone. */
export const OPTIONS_ZONE = ZONES.map((z) => ({ valeur: z, libelle: z }));

/* -------------------------------------------------------------------------- */
/* Statuts d'intervention                                                     */
/* -------------------------------------------------------------------------- */

export const STATUTS = [
  "NOUVELLE",
  "ASSIGNEE",
  "EN_COURS",
  "TERMINEE",
  "ANNULEE",
] as const;
export type Statut = (typeof STATUTS)[number];

export const STATUT_LABELS: Record<Statut, string> = {
  NOUVELLE: "Nouvelle",
  ASSIGNEE: "Assignée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

/**
 * Transitions autorisees. `changerStatut()` (lib/interventions.ts) refuse
 * tout ce qui n'est pas liste ici.
 */
export const TRANSITIONS_STATUT: Record<Statut, readonly Statut[]> = {
  NOUVELLE: ["ASSIGNEE", "ANNULEE"],
  ASSIGNEE: ["EN_COURS", "ANNULEE"],
  EN_COURS: ["TERMINEE", "ANNULEE"],
  TERMINEE: [],
  ANNULEE: [],
};

/**
 * Une couleur par statut, reutilisee partout : badges, tableaux, graphiques.
 * `badge` contient des classes Tailwind completes (jamais construites
 * dynamiquement, sinon Tailwind ne les compile pas). `hex` sert a recharts,
 * qui prend une couleur brute.
 */
/**
 * Status colours — one per state, reused in badges, tables and charts.
 *
 * The green/red pair was measured, not chosen by eye. The obvious
 * `#16A34A` / `#DC2626` are **indistinguishable to a red-green colourblind
 * reader**: OKLab ΔE 5.0 under deuteranopia, where 8 is the threshold. Since
 * "Terminée" and "Annulée" are the two states a supervisor must never confuse,
 * both were re-stepped darker until the pair separated on lightness, which is
 * the only channel colour-vision deficiency leaves intact.
 *
 *   #15803D ↔ #921C1C — ΔE 8.7 (deuteranopia), lightness band and
 *   normal-vision separation both passing.
 *
 * `NOUVELLE` stays deliberately grey: it is the absence of a state, and grey is
 * the only honest way to say "nothing has happened yet".
 *
 * Colour is never the sole carrier of meaning here — every badge shows its
 * label, every bar its value, every chart its legend.
 */
export const STATUT_COULEURS: Record<Statut, { hex: string; badge: string }> = {
  NOUVELLE: {
    hex: "#64748B", // gris ardoise — état neutre, volontairement sans teinte
    badge: "bg-slate-100 text-slate-700 border-slate-300",
  },
  ASSIGNEE: {
    hex: "#2563EB", // bleu
    badge: "bg-blue-50 text-blue-700 border-blue-300",
  },
  EN_COURS: {
    hex: "#F59E0B", // ambre alerte
    badge: "bg-amber-50 text-amber-800 border-amber-300",
  },
  TERMINEE: {
    hex: "#15803D", // vert profond — assombri pour se séparer du rouge
    badge: "bg-green-50 text-green-800 border-green-300",
  },
  ANNULEE: {
    hex: "#921C1C", // rouge brique — assombri pour se séparer du vert
    badge: "bg-red-50 text-red-800 border-red-300",
  },
};

/**
 * Accents des indicateurs chiffrés, nommés par **intention** et non par teinte.
 *
 * Un composant ne doit jamais écrire un code hexadécimal : le jour où le vert
 * change — comme il vient de le faire pour raison d'accessibilité — il ne
 * change qu'ici. « succes » et « danger » reprennent volontairement les
 * couleurs de statut, pour qu'un chiffre vert veuille dire partout la même
 * chose qu'un badge vert.
 */
export const ACCENTS = {
  neutre: STATUT_COULEURS.NOUVELLE.hex,
  info: STATUT_COULEURS.ASSIGNEE.hex,
  attention: STATUT_COULEURS.EN_COURS.hex,
  succes: STATUT_COULEURS.TERMINEE.hex,
  danger: STATUT_COULEURS.ANNULEE.hex,
  /** Cyan profond : lisible sur fond clair, contrairement au cyan de marque. */
  signal: "#0E7490",
} as const;

/* -------------------------------------------------------------------------- */
/* Priorites                                                                  */
/* -------------------------------------------------------------------------- */

export const PRIORITES = ["BASSE", "NORMALE", "HAUTE", "URGENTE"] as const;
export type Priorite = (typeof PRIORITES)[number];

export const PRIORITE_LABELS: Record<Priorite, string> = {
  BASSE: "Basse",
  NORMALE: "Normale",
  HAUTE: "Haute",
  URGENTE: "Urgente",
};

export const PRIORITE_COULEURS: Record<Priorite, { hex: string; badge: string }> = {
  BASSE: {
    hex: "#64748B",
    badge: "bg-slate-100 text-slate-600 border-slate-300",
  },
  NORMALE: {
    hex: "#0B1D3A",
    badge: "bg-slate-100 text-slate-800 border-slate-400",
  },
  HAUTE: {
    hex: "#F59E0B",
    badge: "bg-amber-50 text-amber-800 border-amber-300",
  },
  URGENTE: {
    hex: "#DC2626",
    badge: "bg-red-50 text-red-700 border-red-300",
  },
};

/* -------------------------------------------------------------------------- */
/* Types de panne                                                             */
/* -------------------------------------------------------------------------- */

export const TYPES_PANNE = [
  "COUPURE_TOTALE",
  "DEBIT_FAIBLE",
  "ONT_DEFECTUEUX",
  "CABLE_ENDOMMAGE",
  "NOUVELLE_INSTALLATION",
  "CHANGEMENT_ROUTEUR",
  "AUTRE",
] as const;
export type TypePanne = (typeof TYPES_PANNE)[number];

export const TYPE_PANNE_LABELS: Record<TypePanne, string> = {
  COUPURE_TOTALE: "Coupure totale",
  DEBIT_FAIBLE: "Débit faible",
  ONT_DEFECTUEUX: "ONT défectueux",
  CABLE_ENDOMMAGE: "Câble endommagé",
  NOUVELLE_INSTALLATION: "Nouvelle installation",
  CHANGEMENT_ROUTEUR: "Changement de routeur",
  AUTRE: "Autre",
};

/* -------------------------------------------------------------------------- */
/* Regles metier chiffrees                                                    */
/* -------------------------------------------------------------------------- */

/** Cout bcrypt pour le hachage des mots de passe. */
export const BCRYPT_ROUNDS = 10;

/** Longueur minimale du rapport exige pour passer une intervention en TERMINEE. */
export const RAPPORT_LONGUEUR_MIN = 10;

/** Bornes de la note laissee par le client. */
export const NOTE_MIN = 1;
export const NOTE_MAX = 5;

/* -------------------------------------------------------------------------- */
/* Gardes de type                                                             */
/* -------------------------------------------------------------------------- */

export function estRole(valeur: string): valeur is Role {
  return (ROLES as readonly string[]).includes(valeur);
}

export function estStatut(valeur: string): valeur is Statut {
  return (STATUTS as readonly string[]).includes(valeur);
}

export function estPriorite(valeur: string): valeur is Priorite {
  return (PRIORITES as readonly string[]).includes(valeur);
}

export function estTypePanne(valeur: string): valeur is TypePanne {
  return (TYPES_PANNE as readonly string[]).includes(valeur);
}

/**
 * Libelle francais d'une valeur lue en base. La colonne est un `String`, donc
 * une valeur inconnue reste theoriquement possible : on la renvoie telle quelle
 * plutot que d'afficher "undefined".
 */
export function libelleStatut(valeur: string): string {
  return estStatut(valeur) ? STATUT_LABELS[valeur] : valeur;
}

export function libellePriorite(valeur: string): string {
  return estPriorite(valeur) ? PRIORITE_LABELS[valeur] : valeur;
}

export function libelleTypePanne(valeur: string): string {
  return estTypePanne(valeur) ? TYPE_PANNE_LABELS[valeur] : valeur;
}

export function couleurStatut(valeur: string) {
  return estStatut(valeur) ? STATUT_COULEURS[valeur] : STATUT_COULEURS.NOUVELLE;
}

export function couleurPriorite(valeur: string) {
  return estPriorite(valeur) ? PRIORITE_COULEURS[valeur] : PRIORITE_COULEURS.NORMALE;
}
