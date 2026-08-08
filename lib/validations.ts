import { z } from "zod";

import {
  MOYENS_EN_LIGNE,
  NOTE_MAX,
  NOTE_MIN,
  PRIORITES,
  RAPPORT_LONGUEUR_MIN,
  STATUTS_COMPTE,
  TYPES_PANNE,
  ZONES,
} from "@/lib/constants";
import { estCheminPhotoValide } from "@/lib/televersement";

/**
 * Every payload entering the API goes through one of these schemas.
 * Messages are in French because they are shown to the user as-is.
 */

const texteObligatoire = (champ: string, min = 1) =>
  z.string().trim().min(min, `${champ} est obligatoire.`);

/** Exigences communes a tous les mots de passe de l'application. */
const motDePasseFort = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.");

/** Chemin d'une photo deja televersee, ou rien. */
const photoFacultative = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || estCheminPhotoValide(v), "Photo invalide.");

const telephoneTunisien = z
  .string()
  .trim()
  .regex(
    /^(\+216[\s.-]?)?[0-9][0-9\s.-]{7,}$/,
    "Numéro de téléphone invalide (ex. +216 20 123 456).",
  );

/** Zone d'intervention : une des valeurs de la liste, jamais du texte libre. */
const zoneValide = z.enum(ZONES, {
  message: "Choisissez une zone d’intervention.",
});

/** Inscription client (page /register). */
export const inscriptionSchema = z.object({
  prenom: texteObligatoire("Le prénom").max(50),
  nom: texteObligatoire("Le nom").max(50),
  email: z.email("Adresse e-mail invalide."),
  telephone: telephoneTunisien,
  motDePasse: motDePasseFort,
  operateurId: texteObligatoire("L’opérateur"),
  adresse: texteObligatoire("L’adresse").max(160),
  ville: texteObligatoire("La ville").max(60),
  zone: zoneValide,
  numContrat: texteObligatoire("Le numéro de contrat").max(40),
});

/**
 * Inscription d'un technicien par lui-meme (page /register/technicien).
 *
 * Aucun matricule ici : c'est le superviseur qui l'attribue en validant le
 * compte. Le compte est cree en EN_ATTENTE et ne peut pas se connecter avant.
 */
export const inscriptionTechnicienSchema = z.object({
  prenom: texteObligatoire("Le prénom").max(50),
  nom: texteObligatoire("Le nom").max(50),
  email: z.email("Adresse e-mail invalide."),
  telephone: telephoneTunisien,
  motDePasse: motDePasseFort,
  specialite: texteObligatoire("La spécialité").max(80),
  zone: zoneValide,
});

/** Declaration d'une panne par un client. */
export const nouvellePanneSchema = z.object({
  typePanne: z.enum(TYPES_PANNE, {
    message: "Choisissez un type de panne.",
  }),
  priorite: z.enum(PRIORITES, { message: "Choisissez une priorité." }),
  description: z
    .string()
    .trim()
    .min(20, "Décrivez la panne en 20 caractères minimum.")
    .max(1000, "La description ne peut pas dépasser 1000 caractères."),
  photoPanne: photoFacultative,
});

/**
 * Une piece remplacee, ajoutee a la facture par le technicien.
 *
 * `montant` est un entier de MILLIMES, jamais des dinars decimaux : le
 * formulaire convertit avec `dinarsEnMillimes` avant d'envoyer. Voir
 * lib/monnaie.ts pour la raison.
 */
const pieceFactureeSchema = z.object({
  designation: texteObligatoire("La désignation de la pièce").max(80),
  montant: z
    .number()
    .int("Le montant doit être un nombre entier de millimes.")
    .positive("Le montant d’une pièce doit être supérieur à zéro.")
    .max(2_000_000, "Une pièce ne peut pas dépasser 2000 DT."),
});

/** Cloture d'une intervention par le technicien. */
export const rapportSchema = z.object({
  rapport: z
    .string()
    .trim()
    .min(
      RAPPORT_LONGUEUR_MIN,
      `Le rapport doit contenir au moins ${RAPPORT_LONGUEUR_MIN} caractères.`,
    )
    .max(2000, "Le rapport ne peut pas dépasser 2000 caractères."),
  photoRapport: photoFacultative,
  /** Pieces remplacees, facturees en plus du deplacement. */
  pieces: z
    .array(pieceFactureeSchema)
    .max(10, "Dix pièces au maximum sur une même facture.")
    .optional(),
});

/* -------------------------------------------------------------------------- */
/* Paiements                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Ouverture d'un paiement en ligne par le client.
 *
 * `ESPECES` est volontairement absent de `MOYENS_EN_LIGNE` : l'argent liquide
 * passe par le technicien sur place, le client ne peut pas le declencher seul
 * depuis son espace.
 */
export const paiementEnLigneSchema = z.object({
  moyen: z.enum(MOYENS_EN_LIGNE, {
    message: "Choisissez un moyen de paiement.",
  }),
});

/** Encaissement d'especes par le technicien, en millimes. */
export const encaissementSchema = z.object({
  montant: z
    .number()
    .int("Le montant doit être un nombre entier de millimes.")
    .positive("Le montant encaissé doit être supérieur à zéro."),
});

/** Remise des especes a la societe, declaree par le technicien. */
export const versementSchema = z.object({
  commentaire: z.string().trim().max(300).optional(),
});

/**
 * Motif d'une rectification de facture.
 *
 * Obligatoire et un peu long : « erreur » ne dit rien a qui relira la facture
 * dans six mois, et c'est l'abonne qui le lira en premier.
 */
const motifRectification = z
  .string()
  .trim()
  .min(10, "Expliquez la rectification en 10 caractères minimum.")
  .max(300, "Le motif ne peut pas dépasser 300 caractères.");

/** Correction des lignes d'une facture non reglee, par le superviseur. */
export const correctionFactureSchema = z.object({
  motif: motifRectification,
  lignes: z
    .array(pieceFactureeSchema)
    .min(1, "Une facture garde au moins une ligne.")
    .max(12, "Douze lignes au maximum sur une même facture."),
});

/** Annulation d'une facture qui n'aurait pas du etre emise. */
export const annulationFactureSchema = z.object({
  motif: motifRectification,
});

/**
 * Enregistrement de la paie versee a un technicien pour un mois.
 *
 * Aucun montant dans le payload : il est recalcule cote serveur, comme celui
 * d'une remise d'especes. Le tableau de paie est a l'ecran au moment du clic,
 * donc un montant envoye serait un montant que le navigateur peut modifier.
 */
export const versementPaieSchema = z.object({
  technicienId: texteObligatoire("Le technicien"),
  mois: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Mois attendu au format AAAA-MM."),
  commentaire: z.string().trim().max(300).optional(),
});

/** Annulation d'un bulletin enregistre par erreur. */
export const annulationBulletinSchema = z.object({
  motif: motifRectification,
});

/** Notation d'une intervention terminee par le client. */
export const notationSchema = z.object({
  note: z
    .number()
    .int()
    .min(NOTE_MIN, `La note va de ${NOTE_MIN} à ${NOTE_MAX}.`)
    .max(NOTE_MAX, `La note va de ${NOTE_MIN} à ${NOTE_MAX}.`),
});

/** Assignation manuelle par le superviseur. */
export const assignationSchema = z.object({
  technicienId: texteObligatoire("Le technicien"),
});

/** Annulation, avec motif facultatif. */
export const annulationSchema = z.object({
  motif: z.string().trim().max(300).optional(),
});

/**
 * Mise a jour du profil technicien par lui-meme.
 *
 * La zone n'y figure pas : elle decide quelles pannes il voit, donc la changer
 * reviendrait a choisir son secteur. C'est une decision d'affectation, elle
 * reste au superviseur (voir `zoneTechnicienSchema`).
 */
export const profilTechnicienSchema = z.object({
  telephone: telephoneTunisien,
  specialite: texteObligatoire("La spécialité").max(80),
  disponible: z.boolean(),
  photoUrl: photoFacultative,
});

/** Changement de zone d'un technicien par le superviseur. */
export const zoneTechnicienSchema = z.object({
  zone: zoneValide,
});

/** Logo d'un reseau partenaire, pose par le superviseur. */
export const logoOperateurSchema = z.object({
  logoUrl: photoFacultative,
});

/** Mise a jour du profil client par lui-meme. */
export const profilClientSchema = z.object({
  prenom: texteObligatoire("Le prénom").max(50),
  nom: texteObligatoire("Le nom").max(50),
  telephone: telephoneTunisien,
  adresse: texteObligatoire("L’adresse").max(160),
  ville: texteObligatoire("La ville").max(60),
  zone: zoneValide,
});

/** Changement de mot de passe, quel que soit le role. */
export const changementMotDePasseSchema = z
  .object({
    actuel: z.string().min(1, "Saisissez votre mot de passe actuel."),
    nouveau: motDePasseFort,
    confirmation: z.string(),
  })
  .refine((d) => d.nouveau === d.confirmation, {
    path: ["confirmation"],
    message: "Les deux mots de passe ne correspondent pas.",
  })
  .refine((d) => d.nouveau !== d.actuel, {
    path: ["nouveau"],
    message: "Le nouveau mot de passe doit être différent de l’actuel.",
  });

/** Creation d'un compte technicien par le superviseur. */
export const nouveauTechnicienSchema = z.object({
  prenom: texteObligatoire("Le prénom").max(50),
  nom: texteObligatoire("Le nom").max(50),
  email: z.email("Adresse e-mail invalide."),
  telephone: telephoneTunisien,
  motDePasse: motDePasseFort,
  matricule: texteObligatoire("Le matricule").max(20),
  specialite: texteObligatoire("La spécialité").max(80),
  zone: zoneValide,
});

/** Changement d'etat d'un compte technicien par le superviseur. */
export const statutCompteSchema = z.object({
  statutCompte: z.enum(STATUTS_COMPTE, {
    message: "État de compte inconnu.",
  }),
});

/**
 * Validation d'un technicien inscrit par lui-meme : le superviseur lui donne
 * son matricule et passe le compte en ACTIF, en une seule etape.
 */
export const validationTechnicienSchema = z.object({
  matricule: texteObligatoire("Le matricule").max(20),
  zone: zoneValide,
});

/** Premier message d'erreur lisible, pour les reponses API. */
export function premiereErreur(erreur: z.ZodError) {
  return erreur.issues[0]?.message ?? "Données invalides.";
}
