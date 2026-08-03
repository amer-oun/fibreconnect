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

const VARIANTES: Record<VarianteBouton, string> = {
  principal:
    "bg-nuit text-ivoire border-nuit hover:bg-nuit-700 hover:border-nuit-700",
  secondaire:
    "bg-white text-nuit border-trait hover:border-ardoise hover:bg-ivoire",
  discret:
    "bg-transparent text-ardoise border-transparent hover:text-nuit hover:bg-ivoire",
  danger:
    "bg-white text-critique border-red-300 hover:bg-red-50 hover:border-critique",
  signal:
    "bg-signal-profond text-white border-signal-profond hover:bg-nuit hover:border-nuit",
};

const TAILLES = {
  normal: "px-4 py-2 text-sm",
  petit: "px-2.5 py-1.5 text-xs",
  grand: "px-5 py-2.5 text-base",
};

export function classesBouton(
  variante: VarianteBouton = "principal",
  taille: keyof typeof TAILLES = "normal",
) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-net border font-medium",
    "transition-colors duration-150",
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
