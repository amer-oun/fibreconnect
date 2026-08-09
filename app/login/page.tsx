import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROLE_ACCUEIL } from "@/lib/constants";
import { utilisateurConnecte } from "@/lib/session";
import { Marque } from "@/components/navigation/marque";
import ComptesDemonstration from "./comptes-demonstration";
import FormulaireConnexion from "./formulaire-connexion";

export const metadata: Metadata = { title: "Connexion" };

/**
 * A single form for the three roles: the destination comes from the role
 * stored in the session, never from a choice made by the visitor.
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
  // chemin interne, sinon le site servirait de tremplin vers un autre domaine.
  const destination =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : undefined;

  const modeDemo = process.env.NEXT_PUBLIC_MODE_DEMO !== "false";

  return (
    <main className="flex min-h-screen items-center justify-center bg-nuit px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Marque />
        </div>

        <div className="rounded-bloc border border-trait bg-white p-7 sm:p-8">
          <h1 className="font-display text-xl font-bold tracking-tight text-nuit">
            Connexion
          </h1>
          <p className="mt-1.5 mb-6 text-sm text-ardoise">
            Clients, techniciens et superviseurs utilisent le même formulaire.
            Votre espace s’ouvre selon votre rôle.
          </p>

          <FormulaireConnexion callbackUrl={destination} />

          <p className="mt-4 text-sm">
            <Link
              href="/mot-de-passe-oublie"
              className="text-ardoise underline decoration-trait underline-offset-4 hover:text-signal-profond hover:decoration-signal"
            >
              Mot de passe oublié ?
            </Link>
          </p>

          <div className="mt-6 space-y-2 border-t border-trait pt-5 text-sm text-ardoise">
            <p>
              Vous êtes abonné et vous n’avez pas encore de compte ?{" "}
              <Link
                href="/register"
                className="font-medium text-nuit underline decoration-signal decoration-2 underline-offset-4 hover:text-signal-profond"
              >
                Créer un compte client
              </Link>
            </p>
            <p>
              Vous êtes technicien fibre ?{" "}
              <Link
                href="/register/technicien"
                className="font-medium text-nuit underline decoration-signal decoration-2 underline-offset-4 hover:text-signal-profond"
              >
                Déposer une candidature
              </Link>
            </p>
          </div>
        </div>

        {modeDemo && <ComptesDemonstration />}

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-ardoise hover:text-signal">
            Retour à l’accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
