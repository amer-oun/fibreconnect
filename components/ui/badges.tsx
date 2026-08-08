import {
  STATUT_COMPTE_COULEURS,
  STATUT_COMPTE_LABELS,
  STATUT_FACTURE_COULEURS,
  STATUT_FACTURE_LABELS,
  STATUT_PAIEMENT_LABELS,
  couleurPriorite,
  couleurStatut,
  libellePriorite,
  libelleStatut,
  type StatutCompte,
  type StatutFacture,
  type StatutPaiement,
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

/** État d'une facture : à payer, payée, annulée. */
export function BadgeFacture({ statut }: { statut: string }) {
  const connu = statut in STATUT_FACTURE_LABELS;
  const cle = (connu ? statut : "A_PAYER") as StatutFacture;

  return (
    <span className={`${BASE} ${STATUT_FACTURE_COULEURS[cle]}`}>
      {STATUT_FACTURE_LABELS[cle]}
    </span>
  );
}

/**
 * État d'un règlement.
 *
 * Sans teinte propre : le badge de facture porte déjà la couleur, et deux
 * pastilles colorées côte à côte se disputeraient le même sens.
 */
export function BadgePaiement({ statut }: { statut: string }) {
  const connu = statut in STATUT_PAIEMENT_LABELS;
  const cle = (connu ? statut : "EN_ATTENTE") as StatutPaiement;

  const teintes: Record<StatutPaiement, string> = {
    EN_ATTENTE: "border-trait bg-ivoire text-ardoise",
    CONFIRME: "border-green-300 bg-green-50 text-green-800",
    ECHOUE: "border-red-300 bg-red-50 text-red-800",
  };

  return (
    <span className={`${BASE} ${teintes[cle]}`}>
      {STATUT_PAIEMENT_LABELS[cle]}
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
