import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROLE_ACCUEIL } from "@/lib/constants";
import { utilisateurConnecte } from "@/lib/session";
import FormulaireConnexion from "./formulaire-connexion";

export const metadata: Metadata = {
  title: "Connexion — FibreConnect",
};

/**
 * Un seul formulaire pour les trois roles : la redirection se fait sur le role
 * lu dans la session, pas sur un choix de l'utilisateur.
 */
export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur) redirect(ROLE_ACCUEIL[utilisateur.role]);

  const { callbackUrl } = await searchParams;

  // `callbackUrl` vient de l'URL, donc de l'utilisateur : on n'accepte qu'un
  // chemin interne, sinon le site pourrait servir de tremplin vers un autre.
  const destination =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-nuit px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-ivoire"
          >
            Fibre<span className="text-signal">Connect</span>
          </Link>
          <p className="mt-2 text-sm text-slate-400">
            Gestion des interventions fibre optique
          </p>
        </div>

        <div className="rounded-lg bg-ivoire p-8 shadow-xl">
          <h1 className="text-xl font-semibold text-nuit">Connexion</h1>
          <p className="mt-1 mb-6 text-sm text-ardoise">
            Clients, techniciens et superviseurs se connectent ici.
          </p>

          <FormulaireConnexion callbackUrl={destination} />
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          <Link href="/" className="hover:text-signal">
            Retour à l’accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
