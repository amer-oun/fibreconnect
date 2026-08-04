import type { NextConfig } from "next";

const enDeveloppement = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Read it as the list of places the browser is allowed to fetch from. Anything
 * absent is refused, so an injected `<script src="http://…">` never runs.
 *
 * Two concessions are unavoidable here and worth naming rather than hiding:
 *
 *   - `'unsafe-inline'` on scripts, because Next.js ships its hydration payload
 *     as inline `<script>` tags. Removing it means generating a nonce per
 *     request and threading it through the framework — real work, and work that
 *     has to survive every Next.js upgrade.
 *   - `'unsafe-inline'` on styles, because Tailwind and Leaflet both write
 *     inline `style` attributes (the map positions every tile that way).
 *
 * The map is the only thing that talks to the outside world: OpenStreetMap
 * tiles. Nothing else may leave the origin.
 */
const CSP = [
  "default-src 'self'",
  // `unsafe-eval` uniquement en developpement : le rechargement a chaud de
  // Turbopack en depend. Il disparait du build de production.
  `script-src 'self' 'unsafe-inline'${enDeveloppement ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // `data:` pour les marqueurs SVG de la carte, `blob:` pour l'apercu local
  // d'une photo avant son envoi.
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  // `ws:` en developpement pour le canal de rechargement a chaud.
  `connect-src 'self'${enDeveloppement ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const ENTETES = [
  { key: "Content-Security-Policy", value: CSP },
  // Interdit d'encadrer l'application : protege du detournement de clic.
  // Redondant avec `frame-ancestors`, garde pour les navigateurs anciens.
  { key: "X-Frame-Options", value: "DENY" },
  // Empeche le navigateur de deviner le type d'un fichier servi.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // L'adresse d'une page interne ne fuit pas vers un site tiers.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // On n'utilise aucune de ces fonctions. `camera=(self)` reste ouvert parce
  // que le technicien photographie son intervention depuis son telephone.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root: another lockfile exists higher up in the user folder.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:chemin*", headers: ENTETES }];
  },
};

export default nextConfig;
