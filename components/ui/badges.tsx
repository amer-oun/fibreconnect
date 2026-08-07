import {
  STATUT_COMPTE_COULEURS,
  STATUT_COMPTE_LABELS,
  couleurPriorite,
  couleurStatut,
  libellePriorite,
  libelleStatut,
  type StatutCompte,
} from "@/lib/constants";

/**
 * Status and priority pills. The colour of a status is constant across the
 * whole app — badges, tables and charts all read it from lib/constants.
 */

const BASE =
  "inline-flex items-center gap-1.5 rounded-net border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function BadgeStatut({ statut }: { statut: string }) {
  const couleur = couleurStatut(statut);
  return (
    <span className={`${BASE} ${couleur.badge}`}>
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: couleur.hex }}
      />
      {libelleStatut(statut)}
    </span>
  );
}

export function BadgePriorite({ priorite }: { priorite: string }) {
  const couleur = couleurPriorite(priorite);
  const urgent = priorite === "URGENTE" || priorite === "HAUTE";
  return (
    <span className={`${BASE} ${couleur.badge}`}>
      {urgent && (
        <span aria-hidden className="font-mono text-[0.65rem]">
          !
        </span>
      )}
      {libellePriorite(priorite)}
    </span>
  );
}

/**
 * État d'un compte technicien.
 *
 * Rien pour un compte actif : c'est l'état normal, et un badge « Actif » sur
 * chaque ligne d'une liste où presque tout est actif ne dit rien. Seuls les
 * deux états qui appellent une action s'affichent.
 */
export function BadgeCompte({ statutCompte }: { statutCompte: string }) {
  if (statutCompte === "ACTIF") return null;

  const connu = statutCompte in STATUT_COMPTE_LABELS;
  const cle = (connu ? statutCompte : "DESACTIVE") as StatutCompte;

  return (
    <span className={`${BASE} ${STATUT_COMPTE_COULEURS[cle]}`}>
      {STATUT_COMPTE_LABELS[cle]}
    </span>
  );
}

/** Zone d'intervention, avec la même graphie partout. */
export function BadgeZone({ zone }: { zone: string }) {
  return (
    <span className={`${BASE} border-trait bg-ivoire text-ardoise`}>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M10 17s5-4.5 5-8a5 5 0 10-10 0c0 3.5 5 8 5 8z" />
        <circle cx="10" cy="9" r="1.75" />
      </svg>
      {zone}
    </span>
  );
}

/** Reference courte d'une intervention, lisible et citable au telephone. */
export function Reference({ id }: { id: string }) {
  return (
    <span className="font-mono text-xs tracking-tight text-ardoise">
      #{id.slice(-6).toUpperCase()}
    </span>
  );
}
