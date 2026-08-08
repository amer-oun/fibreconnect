import { delaiDe, heuresAvantEcheance } from "@/lib/constants";

/**
 * Time left before the company misses its own pick-up target.
 *
 * Shown only on `NOUVELLE` faults, because that is the only stretch anyone can
 * still act on: once a technician has accepted, the promise is kept and the
 * countdown would only be a reproach.
 *
 * Written in words rather than a raw timestamp — "il reste 3 h" is a decision,
 * "échéance 14:20" is an arithmetic problem to solve while holding a phone at
 * the top of a ladder.
 *
 * The badge never carries meaning by colour alone: late says "En retard",
 * on-time says how long is left, and the amber ring is only a second reading.
 */
export default function Echeance({
  dateCreation,
  priorite,
  statut,
}: {
  dateCreation: Date;
  priorite: string;
  statut: string;
}) {
  if (statut !== "NOUVELLE") return null;

  // L'instant est lu au rendu, côté serveur : le badge vaut pour la page telle
  // qu'elle a été produite, ce que la date de déclaration affichée à côté
  // permet de recouper.
  const restant = heuresAvantEcheance(dateCreation, priorite, new Date());
  const enRetard = restant < 0;
  const heures = Math.floor(Math.abs(restant));
  const minutes = Math.round((Math.abs(restant) - heures) * 60);

  const duree =
    heures >= 24
      ? `${Math.floor(heures / 24)} j ${heures % 24} h`
      : heures >= 1
        ? `${heures} h ${String(minutes).padStart(2, "0")}`
        : `${minutes} min`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-net border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        enRetard
          ? "border-red-300 bg-red-50 text-red-800"
          : restant < delaiDe(priorite) / 4
            ? "border-amber-300 bg-amber-50 text-amber-800"
            : "border-trait bg-ivoire text-ardoise"
      }`}
      title={`Délai de prise en charge : ${delaiDe(priorite)} h pour une priorité de ce niveau`}
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v4l2.5 2" strokeLinecap="round" />
      </svg>
      {enRetard ? `En retard de ${duree}` : `Il reste ${duree}`}
    </span>
  );
}
