"use client";

import dynamic from "next/dynamic";

import type { PointClient } from "@/components/carte/carte-interne";

/**
 * Leaflet touches `window` as soon as it is imported, so the map is loaded
 * only in the browser. `ssr: false` is legal here because this file is itself
 * a client component.
 */
const CarteInterne = dynamic(
  () => import("@/components/carte/carte-interne"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-ivoire text-sm text-ardoise">
        Chargement de la carte…
      </div>
    ),
  },
);

export default function CarteClients({ points }: { points: PointClient[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-ivoire px-6 text-center text-sm text-ardoise">
        Aucun abonné ne dispose de coordonnées géographiques. Elles sont
        renseignées à la pose de la ligne.
      </div>
    );
  }

  return <CarteInterne points={points} />;
}
