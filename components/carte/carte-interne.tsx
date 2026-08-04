"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export type PointClient = {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  numContrat: string;
  operateur: string;
  latitude: number;
  longitude: number;
  interventionsOuvertes: number;
};

/**
 * OpenStreetMap tiles, no API key — a requirement of the brief.
 *
 * Markers are built with `divIcon` rather than Leaflet's default PNG icon:
 * the default one resolves its image through a bundler-relative URL and shows
 * up broken under Turbopack. Drawing our own also lets the pin carry the
 * subscriber's state.
 */

function pastille(couleur: string, alerte: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
    html: `<span style="
      display:block;width:22px;height:22px;border-radius:50%;
      background:${couleur};border:2.5px solid #fff;
      box-shadow:0 0 0 1px rgba(11,29,58,.25);
      ${alerte ? "outline:2px solid #F59E0B;outline-offset:2px;" : ""}
    "></span>`,
  });
}

const COULEURS_OPERATEUR: Record<string, string> = {
  "Tunisie Telecom": "#0891B2",
  Ooredoo: "#B45309",
  Orange: "#7C3AED",
};

export default function CarteInterne({ points }: { points: PointClient[] }) {
  // Centre par défaut : centre géographique approximatif du nord tunisien.
  const centre: [number, number] =
    points.length > 0
      ? [
          points.reduce((s, p) => s + p.latitude, 0) / points.length,
          points.reduce((s, p) => s + p.longitude, 0) / points.length,
        ]
      : [35.8, 10.2];

  return (
    <MapContainer
      center={centre}
      zoom={7}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      className="rounded-net"
    >
      <TileLayer
        attribution='&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.latitude, point.longitude]}
          icon={pastille(
            COULEURS_OPERATEUR[point.operateur] ?? "#64748B",
            point.interventionsOuvertes > 0,
          )}
        >
          <Popup>
            <span style={{ fontFamily: "var(--font-plex-sans)" }}>
              <strong style={{ display: "block", color: "#0B1D3A" }}>
                {point.nom}
              </strong>
              <span style={{ color: "#64748B", fontSize: "0.8125rem" }}>
                {point.adresse}
                <br />
                {point.ville}
              </span>
              <br />
              <span
                style={{
                  fontFamily: "var(--font-plex-mono)",
                  fontSize: "0.75rem",
                  color: "#64748B",
                }}
              >
                {point.numContrat} · {point.operateur}
              </span>
              <br />
              <span
                style={{
                  fontSize: "0.8125rem",
                  color: point.interventionsOuvertes > 0 ? "#B45309" : "#16A34A",
                }}
              >
                {point.interventionsOuvertes > 0
                  ? `${point.interventionsOuvertes} intervention${point.interventionsOuvertes > 1 ? "s" : ""} en cours`
                  : "Aucune intervention en cours"}
              </span>
            </span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
