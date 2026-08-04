import Link from "next/link";

import { Marque } from "@/components/navigation/marque";

export default function PageIntrouvable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-nuit px-5 py-12 text-center">
      <Marque />

      <p className="eyebrow mt-10 text-signal">Erreur 404</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ivoire sm:text-4xl">
        Cette page n’existe pas
      </h1>
      <p className="mt-4 max-w-md text-brume">
        Le lien est peut-être périmé, ou l’intervention que vous cherchez ne
        vous appartient pas. Revenez à votre espace pour retrouver vos demandes.
      </p>

      {/* Un signal qui s'arrête : la ligne s'interrompt. */}
      <svg
        aria-hidden
        viewBox="0 0 220 12"
        className="mt-10 h-3 w-56"
        fill="none"
      >
        <path d="M0 6h88" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M132 6h88"
          stroke="#1A3A67"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 6"
        />
        <circle cx="88" cy="6" r="3.5" fill="#22D3EE" />
      </svg>

      <Link
        href="/"
        className="mt-10 rounded-net border border-trait bg-white px-5 py-2.5 text-sm font-medium text-nuit transition-colors hover:bg-ivoire"
      >
        Retour à l’accueil
      </Link>
    </main>
  );
}
