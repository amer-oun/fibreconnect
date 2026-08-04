import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ErreurMetier } from "@/lib/interventions";

/**
 * Photo uploads, stored on the local filesystem.
 *
 * Files are deliberately NOT written into `public/`: in a production build
 * Next.js serves `public/` from a snapshot taken at build time, so anything
 * written there afterwards returns 404. They live in `televersements/` at the
 * project root and are served by `app/api/photos/[nom]`, which works
 * identically in development and in production.
 *
 * Limit worth knowing: the files sit next to the app, so a host with a
 * read-only or ephemeral filesystem would need an object store instead.
 */

/** Types réellement acceptés, vérifiés sur le contenu et pas sur le nom. */
const TYPES_AUTORISES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Extension → type MIME, pour la réponse de lecture. */
export const TYPES_PAR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo

export const DOSSIER_TELEVERSEMENTS = path.join(
  process.cwd(),
  "televersements",
);

/**
 * Signatures binaires des formats acceptés. Un fichier renommé en `.jpg`
 * mais qui n'en est pas un est rejeté ici, avant d'atteindre le disque.
 */
const SIGNATURES: { type: string; octets: number[] }[] = [
  { type: "image/jpeg", octets: [0xff, 0xd8, 0xff] },
  { type: "image/png", octets: [0x89, 0x50, 0x4e, 0x47] },
];

function typeReel(donnees: Uint8Array, typeDeclare: string) {
  for (const signature of SIGNATURES) {
    if (signature.octets.every((o, i) => donnees[i] === o)) return signature.type;
  }
  // WebP : "RIFF" .... "WEBP"
  const texte = String.fromCharCode(...donnees.slice(0, 12));
  if (texte.startsWith("RIFF") && texte.slice(8, 12) === "WEBP") {
    return "image/webp";
  }
  return typeDeclare;
}

/**
 * Enregistre une image et renvoie l'adresse à laquelle elle sera servie.
 * Le nom est tiré au sort : un fichier envoyé ne peut ni en écraser un autre,
 * ni permettre de deviner l'adresse de celui d'un autre abonné.
 */
export async function enregistrerPhoto(fichier: File): Promise<string> {
  if (fichier.size === 0) {
    throw new ErreurMetier("Le fichier envoyé est vide.");
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    throw new ErreurMetier(
      "L’image ne doit pas dépasser 5 Mo. Réduisez-la et réessayez.",
    );
  }

  const donnees = new Uint8Array(await fichier.arrayBuffer());
  const type = typeReel(donnees, fichier.type);
  const extension = TYPES_AUTORISES[type];

  if (!extension) {
    throw new ErreurMetier(
      "Format non accepté. Envoyez une image JPEG, PNG ou WebP.",
    );
  }

  await mkdir(DOSSIER_TELEVERSEMENTS, { recursive: true });
  const nom = `${randomUUID()}.${extension}`;
  await writeFile(path.join(DOSSIER_TELEVERSEMENTS, nom), donnees);

  return `/api/photos/${nom}`;
}

/** Forme attendue d'un nom de fichier que nous avons nous-mêmes écrit. */
const NOM_VALIDE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** Vérifie qu'un nom reçu dans une URL ne peut pas sortir du dossier. */
export function estNomPhotoValide(nom: string) {
  return NOM_VALIDE.test(nom);
}

/** Vérifie qu'un chemin reçu d'un formulaire désigne bien une de nos photos. */
export function estCheminPhotoValide(valeur: unknown): valeur is string {
  return (
    typeof valeur === "string" &&
    valeur.startsWith("/api/photos/") &&
    estNomPhotoValide(valeur.slice("/api/photos/".length))
  );
}
