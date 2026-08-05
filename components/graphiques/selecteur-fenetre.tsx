import Link from "next/link";

import { FENETRES, type Fenetre } from "@/lib/statistiques";

/**
 * Time-range control for the dashboard.
 *
 * Plain links, like every other filter in this app: the range lives in the URL,
 * so a supervisor can bookmark "last 12 months" and the page stays
 * server-rendered. Middle-click opens the other range in a new tab.
 */
export default function SelecteurFenetre({ courante }: { courante: Fenetre }) {
  return (
    <div className="sans-impression flex items-center gap-2">
      <span className="eyebrow">Période</span>
      <div
        role="group"
        aria-label="Période observée"
        className="flex overflow-hidden rounded-net border border-trait"
      >
        {FENETRES.map((mois, index) => {
          const active = mois === courante;
          return (
            <Link
              key={mois}
              href={mois === 6 ? "/superviseur/dashboard" : `/superviseur/dashboard?mois=${mois}`}
              aria-current={active ? "true" : undefined}
              className={`px-3 py-1.5 text-xs transition-colors pointer-coarse:min-h-11 pointer-coarse:px-4 ${
                index > 0 ? "border-l border-trait" : ""
              } ${
                active
                  ? "bg-nuit font-semibold text-ivoire"
                  : "bg-white text-ardoise hover:bg-ivoire hover:text-nuit"
              }`}
            >
              {mois} mois
            </Link>
          );
        })}
      </div>
    </div>
  );
}
