import { z } from "zod";

import {
  NOTE_MAX,
  NOTE_MIN,
  PRIORITES,
  RAPPORT_LONGUEUR_MIN,
  TYPES_PANNE,
} from "@/lib/constants";

/**
 * Every payload entering the API goes through one of these schemas.
 * Messages are in French because they are shown to the user as-is.
 */

const texteObligatoire = (champ: string, min = 1) =>
  z.string().trim().min(min, `${champ} est obligatoire.`);

/** Inscription client (page /register). */
export const inscriptionSchema = z.object({
  prenom: texteObligatoire("Le prénom").max(50),
  nom: texteObligatoire("Le nom").max(50),
  email: z.email("Adresse e-mail invalide."),
  telephone: z
    .string()
    .trim()
    .regex(
      /^(\+216[\s.-]?)?[0-9][0-9\s.-]{7,}$/,
      "Numéro de téléphone invalide (ex. +216 20 123 456).",
    ),
  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre."),
  operateurId: texteObligatoire("L’opérateur"),
  adresse: texteObligatoire("L’adresse").max(160),
  ville: texteObligatoire("La ville").max(60),
  numContrat: texteObligatoire("Le numéro de contrat").max(40),
});

export type DonneesInscription = z.infer<typeof inscriptionSchema>;

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

/** Mise a jour du profil technicien par lui-meme. */
export const profilTechnicienSchema = z.object({
  telephone: z
    .string()
    .trim()
    .regex(
      /^(\+216[\s.-]?)?[0-9][0-9\s.-]{7,}$/,
      "Numéro de téléphone invalide.",
    ),
  specialite: texteObligatoire("La spécialité").max(80),
  zone: texteObligatoire("La zone").max(60),
  disponible: z.boolean(),
});

/** Activation / desactivation d'un compte technicien par le superviseur. */
export const statutCompteSchema = z.object({
  actif: z.boolean(),
});

/**
 * Traduit une erreur zod en un objet `{ champ: message }` directement
 * exploitable par les formulaires.
 */
export function erreursParChamp(erreur: z.ZodError) {
  const resultat: Record<string, string> = {};
  for (const probleme of erreur.issues) {
    const champ = probleme.path.join(".");
    if (champ && !resultat[champ]) resultat[champ] = probleme.message;
  }
  return resultat;
}

/** Premier message d'erreur lisible, pour les reponses API. */
export function premiereErreur(erreur: z.ZodError) {
  return erreur.issues[0]?.message ?? "Données invalides.";
}
