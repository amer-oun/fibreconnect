"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formaterDelai } from "@/lib/dates";
import type { Notification } from "@/lib/notifications";

/** Alertes calculees a partir des donnees, ouvertes en survol de la cloche. */
export default function ClocheNotifications({
  notifications,
}: {
  notifications: Notification[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);
  const declencheur = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouvert) return;

    function surClic(evenement: MouseEvent) {
      if (!conteneur.current?.contains(evenement.target as Node)) {
        setOuvert(false);
      }
    }
    function surEchap(evenement: KeyboardEvent) {
      if (evenement.key !== "Escape") return;
      setOuvert(false);
      // Sans cela le focus retombe sur le document : la personne qui navigue
      // au clavier reprend depuis le debut de la page.
      declencheur.current?.focus();
    }

    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surEchap);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surEchap);
    };
  }, [ouvert]);

  const alertes = notifications.filter((n) => n.ton === "alerte").length;

  return (
    <div ref={conteneur} className="relative">
      <button
        ref={declencheur}
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        aria-controls="panneau-notifications"
        className="relative flex size-9 items-center justify-center rounded-net text-brume transition-colors hover:bg-nuit-800 hover:text-ivoire pointer-coarse:size-11"
      >
        <span className="sr-only">
          {notifications.length > 0
            ? `${notifications.length} alerte${notifications.length > 1 ? "s" : ""}`
            : "Aucune alerte"}
        </span>
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
          <path d="M10 3a4.5 4.5 0 00-4.5 4.5c0 3.5-1.5 4.5-1.5 4.5h12s-1.5-1-1.5-4.5A4.5 4.5 0 0010 3zM8.5 15a1.5 1.5 0 003 0" />
        </svg>
        {notifications.length > 0 && (
          <span
            aria-hidden
            className={`absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full px-1 font-mono text-[0.625rem] leading-4 font-medium ${
              alertes > 0 ? "bg-alerte text-nuit" : "bg-signal text-nuit"
            }`}
          >
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {ouvert && (
        <div
          id="panneau-notifications"
          role="dialog"
          aria-label="Alertes à traiter"
          className="absolute top-11 right-0 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-bloc border border-trait bg-white"
        >
          <p className="border-b border-trait px-4 py-2.5 font-display text-xs font-semibold tracking-wide text-nuit uppercase">
            À traiter
          </p>

          {/* `overscroll-contain` sur la liste : arrive en bas, la molette ne
              fait pas defiler la page restee derriere le panneau. */}
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ardoise">
              Rien ne demande votre attention pour le moment.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-trait overflow-y-auto overscroll-contain">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.lien}
                    onClick={() => setOuvert(false)}
                    className={`block border-l-2 px-4 py-3 transition-colors hover:bg-ivoire ${
                      n.ton === "alerte"
                        ? "border-l-alerte"
                        : "border-l-transparent"
                    }`}
                  >
                    <p className="text-sm font-medium text-nuit">{n.titre}</p>
                    <p className="mt-0.5 text-xs text-ardoise">{n.detail}</p>
                    <p className="mt-1 font-mono text-[0.6875rem] text-brume">
                      {formaterDelai(n.date)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
