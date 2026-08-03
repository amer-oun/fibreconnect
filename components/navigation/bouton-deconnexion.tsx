"use client";

import { signOut } from "next-auth/react";

/** Deconnexion compacte, utilisee dans la barre haute sur telephone. */
export default function BoutonDeconnexionCompact() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex size-9 items-center justify-center rounded-net text-brume transition-colors hover:bg-nuit-800 hover:text-ivoire"
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
  );
}
