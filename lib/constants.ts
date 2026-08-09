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
/* Delais de prise en charge                                                  */
/* -------------------------------------------------------------------------- */

/**
 * How long the company gives itself to *take on* a fault, in hours, by priority.
 *
 * The clock measures the promise the company can actually keep: a technician
 * accepting the job. It stops at `ASSIGNEE` and never restarts — how long the
 * repair itself takes depends on a cable in the ground, not on dispatch, and
 * counting it here would turn a hard job into a broken promise.
 *
 * `URGENTE` is four hours rather than one: a one-hour target that is missed
 * every single time teaches everyone to ignore the colour, which is worse than
 * having no target at all. A deadline is only useful while it is believed.
 */
export const DELAIS_PRISE_EN_CHARGE: Record<Priorite, number> = {
  URGENTE: 4,
  HAUTE: 24,
  NORMALE: 72,
  BASSE: 168, // une semaine
};

export function delaiDe(priorite: string): number {
  return estPriorite(priorite)
    ? DELAIS_PRISE_EN_CHARGE[priorite]
    : DELAIS_PRISE_EN_CHARGE.NORMALE;
}

/** Instant auquel la panne aurait dû être prise en charge. */
export function echeancePriseEnCharge(dateCreation: Date, priorite: string): Date {
  return new Date(dateCreation.getTime() + delaiDe(priorite) * 3_600_000);
}

/**
 * Heures d'avance (positif) ou de retard (négatif) sur l'échéance.
 *
 * Fonction pure, l'instant courant passé en paramètre : une règle de délai qui
 * lit l'horloge elle-même ne se teste qu'en attendant.
 */
export function heuresAvantEcheance(
  dateCreation: Date,
  priorite: string,
  maintenant: Date,
): number {
  return (
    (echeancePriseEnCharge(dateCreation, priorite).getTime() -
      maintenant.getTime()) /
    3_600_000
  );
}

/**
 * Une intervention est hors délai si elle attend encore un technicien
 * au-delà de son échéance.
 *
 * Seul `NOUVELLE` compte : dès qu'un technicien l'a acceptée, la promesse est
 * tenue, même si le chantier dure ensuite.
 */
export function estHorsDelai(
  intervention: { statut: string; priorite: string; dateCreation: Date },
  maintenant: Date = new Date(),
): boolean {
  if (intervention.statut !== "NOUVELLE") return false;
  return (
    heuresAvantEcheance(
      intervention.dateCreation,
      intervention.priorite,
      maintenant,
    ) < 0
  );
}

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
/* Tarifs                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Prix de base d'une intervention, par type de panne, **hors taxes et en
 * millimes** (voir lib/monnaie.ts : 1 DT = 1000 millimes).
 *
 * Le tarif est annoncé au client **au moment où il déclare sa panne**, pas
 * découvert à la fin : c'est la seule façon honnête de facturer un
 * déplacement, et le seul moyen d'éviter un litige à chaque facture. Le
 * formulaire de déclaration affiche le prix en face de chaque type de panne.
 * Le technicien ajoute ensuite les pièces qu'il a remplacées, chacune sur sa
 * propre ligne de facture.
 *
 * Toutes les lignes de facture sont hors taxes ; la TVA et le droit de timbre
 * s'ajoutent au pied de la facture (voir `TVA_TAUX` et `TIMBRE_FISCAL`).
 *
 * **Ordre de grandeur.** Un abonnement fibre coûte 30 à 60 DT par mois en
 * Tunisie. Un dépannage facturé plus cher que l'abonnement qu'il répare ne se
 * vend pas : ces tarifs situent le déplacement entre 20 et 60 DT hors taxes,
 * soit 24 à 72 DT payés par l'abonné, ce qui est l'ordre de grandeur d'une
 * intervention à domicile. La grille se relit d'un coup d'œil du moins cher au
 * plus cher, ce qui aide à voir qu'elle est cohérente.
 */
export const TARIFS: Record<TypePanne, number> = {
  DEBIT_FAIBLE: 20_000,
  COUPURE_TOTALE: 25_000,
  AUTRE: 25_000,
  CHANGEMENT_ROUTEUR: 30_000,
  ONT_DEFECTUEUX: 35_000,
  CABLE_ENDOMMAGE: 45_000,
  NOUVELLE_INSTALLATION: 60_000,
};

export function tarifDe(typePanne: string): number {
  return estTypePanne(typePanne) ? TARIFS[typePanne] : TARIFS.AUTRE;
}

/* -------------------------------------------------------------------------- */
/* Taxes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Taux de TVA applicable aux prestations de service en Tunisie.
 *
 * Il est **recopié sur chaque facture à son émission** plutôt que lu ici au
 * moment de l'affichage : un taux de TVA change par décision budgétaire, et une
 * facture de l'an dernier doit continuer à se relire avec le taux de l'an
 * dernier. Une facture ancienne dont le total se recalculerait au taux du jour
 * ne correspondrait plus à ce que l'abonné a payé.
 */
export const TVA_TAUX = 0.19;

/**
 * Droit de timbre, en millimes : 1,000 DT par facture.
 *
 * Montant fixe et non proportionnel — il ne dépend ni du montant facturé ni du
 * nombre de lignes. Figé lui aussi sur la facture, pour la même raison que le
 * taux de TVA.
 */
export const TIMBRE_FISCAL = 1_000;

/**
 * Turns invoice lines into the four figures printed at the bottom of one.
 *
 * One function for the whole application — issuing an invoice, correcting one,
 * seeding the demo data, and the preview the technician sees before closing.
 * Two of them rounding differently would produce a total nobody could
 * reproduce, and the one place it would show is the customer's copy.
 *
 * Lives here, next to the rates, rather than in lib/facturation.ts: the
 * technician's closing form is a client component, and pulling in a module
 * that talks to Prisma to add up three numbers would drag the database client
 * into the browser bundle.
 *
 * The rate and the stamp duty are read once here and then **copied onto the
 * invoice**, never looked up again at display time.
 */
export function totauxFacture(lignes: ReadonlyArray<{ montant: number }>) {
  const montantHT = lignes.reduce((somme, l) => somme + l.montant, 0);
  const montantTva = Math.round(montantHT * TVA_TAUX);

  return {
    montantHT,
    tauxTva: TVA_TAUX,
    montantTva,
    timbreFiscal: TIMBRE_FISCAL,
    montantTotal: montantHT + montantTva + TIMBRE_FISCAL,
  };
}

/* -------------------------------------------------------------------------- */
/* Moyens de paiement                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Comment l'abonné règle sa facture.
 *
 * `ESPECES` est à part : c'est le seul moyen où l'argent passe par le
 * technicien au lieu d'aller directement à la société. Il crée donc une dette
 * du technicien envers l'entreprise, que le versement vient éteindre.
 */
export const MOYENS_PAIEMENT = ["ESPECES", "CARTE", "VIREMENT", "D17"] as const;
export type MoyenPaiement = (typeof MOYENS_PAIEMENT)[number];

export const MOYEN_PAIEMENT_LABELS: Record<MoyenPaiement, string> = {
  ESPECES: "Espèces au technicien",
  CARTE: "Carte bancaire",
  VIREMENT: "Virement bancaire",
  D17: "D17 / e-Dinar",
};

/** Ce que le client lit sous chaque choix, avant de s'engager. */
export const MOYEN_PAIEMENT_DETAILS: Record<MoyenPaiement, string> = {
  ESPECES:
    "Vous réglez directement le technicien lors de son passage. Il enregistre l’encaissement depuis son téléphone et vous recevez le reçu ici.",
  CARTE: "Paiement immédiat. Le reçu est disponible aussitôt.",
  VIREMENT:
    "Le virement met un à trois jours ouvrés. Votre facture reste « en attente » jusqu’à sa réception.",
  D17: "Paiement immédiat depuis l’application D17 de La Poste tunisienne.",
};

/**
 * Les moyens que l'abonné peut déclencher lui-même depuis son espace.
 *
 * Écrits en toutes lettres plutôt que dérivés par un `filter` : zod a besoin
 * d'un tuple littéral pour en faire un `z.enum`. Le `satisfies` garantit
 * qu'aucune valeur inconnue de `MOYENS_PAIEMENT` ne s'y glisse.
 */
export const MOYENS_EN_LIGNE = [
  "CARTE",
  "VIREMENT",
  "D17",
] as const satisfies readonly MoyenPaiement[];

export function estMoyenPaiement(valeur: string): valeur is MoyenPaiement {
  return (MOYENS_PAIEMENT as readonly string[]).includes(valeur);
}

export function libelleMoyenPaiement(valeur: string): string {
  return estMoyenPaiement(valeur) ? MOYEN_PAIEMENT_LABELS[valeur] : valeur;
}

/* -------------------------------------------------------------------------- */
/* Statuts de facture et de paiement                                          */
/* -------------------------------------------------------------------------- */

export const STATUTS_FACTURE = ["A_PAYER", "PAYEE", "ANNULEE"] as const;
export type StatutFacture = (typeof STATUTS_FACTURE)[number];

export const STATUT_FACTURE_LABELS: Record<StatutFacture, string> = {
  A_PAYER: "À payer",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

export const STATUT_FACTURE_COULEURS: Record<StatutFacture, string> = {
  A_PAYER: "bg-amber-50 text-amber-800 border-amber-300",
  PAYEE: "bg-green-50 text-green-800 border-green-300",
  ANNULEE: "bg-slate-100 text-slate-700 border-slate-300",
};

/**
 * `EN_ATTENTE` existe pour le virement, qui met des jours à arriver, et pour
 * un paiement en ligne commencé mais pas confirmé. Un paiement n'éteint une
 * facture que lorsqu'il est `CONFIRME`.
 */
export const STATUTS_PAIEMENT = ["EN_ATTENTE", "CONFIRME", "ECHOUE"] as const;
export type StatutPaiement = (typeof STATUTS_PAIEMENT)[number];

export const STATUT_PAIEMENT_LABELS: Record<StatutPaiement, string> = {
  EN_ATTENTE: "En attente",
  CONFIRME: "Confirmé",
  ECHOUE: "Échoué",
};

/**
 * Reversement des espèces collectées par un technicien.
 * `EN_ATTENTE` : le technicien déclare avoir remis l'argent.
 * `CONFIRME` : le superviseur l'a effectivement reçu.
 */
export const STATUTS_VERSEMENT = ["EN_ATTENTE", "CONFIRME"] as const;
export type StatutVersement = (typeof STATUTS_VERSEMENT)[number];

export const STATUT_VERSEMENT_LABELS: Record<StatutVersement, string> = {
  EN_ATTENTE: "Remise déclarée",
  CONFIRME: "Reçue par la société",
};

/* -------------------------------------------------------------------------- */
/* Remuneration des techniciens                                               */
/* -------------------------------------------------------------------------- */

/** Salaire de base mensuel par défaut, en millimes (800 DT). */
export const SALAIRE_BASE_DEFAUT = 800_000;

/** Part du montant facturé qui revient au technicien. */
export const TAUX_COMMISSION_DEFAUT = 0.15;

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
