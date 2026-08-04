import Image from "next/image";

/**
 * Operator mark.
 *
 * FibreConnect subcontracts for three networks, and their logos are their
 * property — none ship with this repository. So the mark degrades to a
 * monogram, which is what every operator shows until a supervisor uploads the
 * real file on /superviseur/reseaux.
 *
 * Same square-with-a-2px-radius as the technician thumbnail, on purpose: these
 * two are the only images in the interface and they should read as one family.
 */

const TAILLES = {
  petit: { classe: "size-5", police: "text-[0.6rem]", pixels: 20 },
  moyen: { classe: "size-8", police: "text-xs", pixels: 32 },
  grand: { classe: "size-16", police: "text-lg", pixels: 64 },
} as const;

/** « Tunisie Telecom » → « TT », « Orange » → « OR ». */
export function monogramme(nom: string) {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length >= 2) {
    return `${mots[0].charAt(0)}${mots[1].charAt(0)}`.toUpperCase();
  }
  return nom.slice(0, 2).toUpperCase();
}

export default function PastilleOperateur({
  nom,
  logoUrl,
  taille = "moyen",
  className = "",
}: {
  nom: string;
  logoUrl: string | null;
  taille?: keyof typeof TAILLES;
  className?: string;
}) {
  const { classe, police, pixels } = TAILLES[taille];
  const commun = `${classe} shrink-0 rounded-net border border-trait ${className}`;

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`Logo ${nom}`}
        width={pixels}
        height={pixels}
        className={`${commun} bg-white object-contain p-0.5`}
        // Servi par /api/photos, hors de portee de l'optimiseur d'images.
        unoptimized
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${commun} ${police} flex items-center justify-center bg-nuit font-display font-bold tracking-tight text-ivoire`}
    >
      {monogramme(nom)}
    </span>
  );
}
