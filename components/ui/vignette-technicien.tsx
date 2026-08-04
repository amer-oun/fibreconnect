import Image from "next/image";

/**
 * Technician thumbnail.
 *
 * Square with a 2px radius rather than the usual round avatar: the whole
 * interface is built on sharp angles — a measuring instrument, not a social
 * network — and a circle here would be the one shape that breaks it.
 *
 * When no photo has been uploaded the initials stand in, so a list never shows
 * a hole or a grey silhouette placeholder.
 */

const TAILLES = {
  petit: { classe: "size-9", police: "text-xs", pixels: 36 },
  moyen: { classe: "size-14", police: "text-sm", pixels: 56 },
  grand: { classe: "size-24", police: "text-2xl", pixels: 96 },
} as const;

export type TailleVignette = keyof typeof TAILLES;

export function initiales(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export default function VignetteTechnicien({
  photoUrl,
  prenom,
  nom,
  taille = "moyen",
  className = "",
}: {
  photoUrl: string | null;
  prenom: string;
  nom: string;
  taille?: TailleVignette;
  className?: string;
}) {
  const { classe, police, pixels } = TAILLES[taille];
  const commun = `${classe} shrink-0 rounded-net border border-trait ${className}`;

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={`Photo de ${prenom} ${nom}`}
        width={pixels}
        height={pixels}
        className={`${commun} object-cover`}
        // Les photos sont servies par /api/photos : l'optimiseur d'images de
        // Next.js n'y a pas acces sans session, il les laisserait passer en 401.
        unoptimized
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${commun} ${police} flex items-center justify-center bg-ivoire font-display font-semibold text-ardoise`}
    >
      {initiales(prenom, nom)}
    </span>
  );
}
