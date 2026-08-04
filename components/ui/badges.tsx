import {
  couleurPriorite,
  couleurStatut,
  libellePriorite,
  libelleStatut,
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

/** Reference courte d'une intervention, lisible et citable au telephone. */
export function Reference({ id }: { id: string }) {
  return (
    <span className="font-mono text-xs tracking-tight text-ardoise">
      #{id.slice(-6).toUpperCase()}
    </span>
  );
}
