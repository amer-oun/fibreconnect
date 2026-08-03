"use client";

import { signOut } from "next-auth/react";

export default function MenuCompte({
  prenom,
  nom,
  role,
  email,
}: {
  prenom: string;
  nom: string;
  role: string;
  email: string;
}) {
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();

  return (
    <div className="flex items-center gap-3 border-t border-nuit-700 px-4 py-3">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-net bg-nuit-700 font-display text-xs font-semibold text-signal"
      >
        {initiales}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ivoire">
          {prenom} {nom}
        </p>
        <p className="truncate text-xs text-brume" title={email}>
          {role}
        </p>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Se déconnecter"
        className="flex size-8 shrink-0 items-center justify-center rounded-net text-brume transition-colors hover:bg-nuit-700 hover:text-ivoire"
      >
        <span className="sr-only">Se déconnecter</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 17H4a1 1 0 01-1-1V4a1 1 0 011-1h4M13 14l4-4-4-4M17 10H8" />
        </svg>
      </button>
    </div>
  );
}
