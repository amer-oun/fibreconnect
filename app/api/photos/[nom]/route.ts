import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DOSSIER_TELEVERSEMENTS,
  TYPES_PAR_EXTENSION,
  estNomPhotoValide,
} from "@/lib/televersement";
import { utilisateurConnecte } from "@/lib/session";
import { reponseErreur } from "@/lib/api";

/**
 * Serves an uploaded photo.
 *
 * A route rather than a file in `public/`, because a production build serves
 * `public/` from a build-time snapshot: anything written at runtime would 404.
 *
 * Two guards. The name must match the exact shape we generate — no `..`, no
 * absolute path, nothing that escapes the folder. And the caller must be
 * signed in: a photo of someone's home should not be readable by anyone who
 * guesses a URL.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ nom: string }> },
) {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) {
    return reponseErreur("Vous devez être connecté.", 401);
  }

  const { nom } = await params;
  if (!estNomPhotoValide(nom)) {
    return reponseErreur("Photo introuvable.", 404);
  }

  const extension = nom.split(".").pop() ?? "";
  const type = TYPES_PAR_EXTENSION[extension];
  if (!type) {
    return reponseErreur("Photo introuvable.", 404);
  }

  try {
    const donnees = await readFile(path.join(DOSSIER_TELEVERSEMENTS, nom));
    return new Response(new Uint8Array(donnees), {
      headers: {
        "Content-Type": type,
        // Le nom est unique et le contenu ne change jamais.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return reponseErreur("Photo introuvable.", 404);
  }
}
