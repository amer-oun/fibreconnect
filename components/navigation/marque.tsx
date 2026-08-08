import Link from "next/link";

/**
 * Logotype. The mark is a single fibre strand crossing a splice point:
 * two hairlines meeting at one lit node.
 */
export function Marque({
  href = "/",
  sombre = true,
  compact = false,
}: {
  href?: string;
  sombre?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 font-display tracking-tight ${
        compact ? "text-base" : "text-lg"
      } ${sombre ? "text-ivoire" : "text-nuit"}`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none">
        <path
          d="M1 17c6 0 5-10 11-10s5 10 11 10"
          stroke={sombre ? "#94A3B8" : "#64748B"}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="7" r="3.2" fill="#22D3EE" />
      </svg>
      <span className="font-semibold">
        Fibre
        {/* Le cyan de marque n'a assez de contraste que sur fond sombre : sur
            fond clair il passe au cyan profond, comme le reste des accents. */}
        <span className={sombre ? "text-signal" : "text-signal-profond"}>
          Connect
        </span>
      </span>
    </Link>
  );
}
