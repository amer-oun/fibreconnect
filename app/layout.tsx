import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Titres : grotesque industrielle, esprit signaletique reseau.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

// Texte courant.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

// Donnees : matricules, references, dates, coordonnees.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "FibreConnect",
    template: "%s — FibreConnect",
  },
  description:
    "Gestion des interventions de maintenance fibre optique : déclaration de panne, suivi client, affectation des techniciens et supervision.",
};

/**
 * Sur un telephone, la barre d'adresse prend cette couleur : le bleu nuit de
 * l'application se prolonge jusqu'en haut de l'ecran au lieu de laisser une
 * bande blanche au-dessus du bandeau sombre.
 *
 * `viewportFit: "cover"` autorise le contenu a passer sous l'encoche — c'est
 * ce qui rend `env(safe-area-inset-*)` operant sur la barre du bas.
 */
export const viewport: Viewport = {
  themeColor: "#0b1d3a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
