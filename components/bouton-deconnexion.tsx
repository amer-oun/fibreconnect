"use client";

import { signOut } from "next-auth/react";

export default function BoutonDeconnexion() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-nuit transition-colors hover:border-ardoise"
    >
      Se déconnecter
    </button>
  );
}
