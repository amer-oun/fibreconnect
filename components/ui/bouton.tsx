import Link from "next/link";

/**
 * One button vocabulary for the whole app.
 * Labels are always active voice: "Accepter l'intervention", never "Valider".
 */

export type VarianteBouton =
  | "principal"
  | "secondaire"
  | "discret"
  | "danger"
  | "signal";

/**
 * Chaque variante porte ses quatre états : repos, survol, appui, désactivé.
 *
 * L'état d'appui (`active:`) manquait. Sans lui, un bouton ne répond pas au
 * doigt : sur un téléphone il n'y a pas de survol, et l'appui était donc le
 * seul retour possible — il n'existait pas.
 */
const VARIANTES: Record<VarianteBouton, string> = {
  principal:
    "bg-nuit text-ivoire border-nuit hover:bg-nuit-700 hover:border-nuit-700 active:bg-nuit-800 active:border-nuit-800",
  secondaire:
    "bg-white text-nuit border-trait hover:border-ardoise hover:bg-ivoire active:bg-trait/60",
  discret:
    "bg-transparent text-ardoise border-transparent hover:text-nuit hover:bg-ivoire active:bg-trait/60",
  danger:
    "bg-white text-critique border-red-300 hover:bg-red-50 hover:border-critique active:bg-red-100",
  signal:
    "bg-signal-profond text-white border-signal-profond hover:bg-nuit hover:border-nuit active:bg-nuit-800 active:border-nuit-800",
};

/**
 * Sizes are dense on a mouse and comfortable on a thumb.
 *
 * `pointer-coarse:` raises every button to the 44px minimum on touch screens
 * without loosening the desktop layout. It matters most for `petit`, which is
 * what the technician taps — "Accepter l'intervention", "Démarrer" — standing
 * at a junction box with one hand on his phone.
 */
const TAILLES = {
  normal: "px-4 py-2 text-sm pointer-coarse:min-h-11 pointer-coarse:px-4",
  petit: "px-2.5 py-1.5 text-xs pointer-coarse:min-h-11 pointer-coarse:px-3.5",
  grand: "px-5 py-2.5 text-base pointer-coarse:min-h-12",
};

export function classesBouton(
  variante: VarianteBouton = "principal",
  taille: keyof typeof TAILLES = "normal",
) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-net border font-medium",
    // On liste les proprietes animees : jamais `transition: all`.
    "transition-colors duration-150",
    // Supprime le delai de 300 ms du double-tap sur telephone.
    "touch-manipulation",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTES[variante],
    TAILLES[taille],
  ].join(" ");
}

type BoutonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBouton;
  taille?: keyof typeof TAILLES;
};

export function Bouton({
  variante = "principal",
  taille = "normal",
  className = "",
  ...props
}: BoutonProps) {
  return (
    <button
      {...props}
      className={`${classesBouton(variante, taille)} ${className}`}
    />
  );
}

type LienBoutonProps = React.ComponentProps<typeof Link> & {
  variante?: VarianteBouton;
  taille?: keyof typeof TAILLES;
};

export function LienBouton({
  variante = "principal",
  taille = "normal",
  className = "",
  ...props
}: LienBoutonProps) {
  return (
    <Link
      {...props}
      className={`${classesBouton(variante, taille)} ${className}`}
    />
  );
}
