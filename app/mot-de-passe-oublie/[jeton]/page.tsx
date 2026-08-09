import type { Metadata } from "next";
import Link from "next/link";

import { compteDuJeton } from "@/lib/reinitialisation";
import { Marque } from "@/components/navigation/marque";
import FormulaireReinitialisation from "./formulaire-reinitialisation";

export const metadata: Metadata = { title: "Choisir un mot de passe" };

/**
 * Le lien reçu par courriel.
 *
 * La validité est contrôlée ici, à l'ouverture : laisser quelqu'un composer un
 * mot de passe pour lui annoncer ensuite que son lien a expiré est une perte
 * de temps évitable. Ce contrôle ne consomme rien — seule la soumission
 * consomme le jeton, et elle revérifie tout de son côté.
 */
export default async function PageReinitialisation({
  params,
}: {
  params: Promise<{ jeton: string }>;
}) {
  const { jeton } = await params;
  const compte = await compteDuJeton(decodeURIComponent(jeton));

  return (
    <main className="flex min-h-screen items-center justify-center bg-nuit px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Marque />
        </div>

        <div className="rounded-bloc border border-trait bg-white">
          <div className="border-b border-trait px-6 py-6 sm:px-7">
            <h1 className="font-display text-xl font-bold tracking-tight text-nuit">
              {compte ? "Choisir un mot de passe" : "Lien expiré"}
            </h1>
            <p className="mt-1.5 text-sm text-ardoise">
              {compte
                ? `Compte ${compte.email}. Ce lien sera invalide dès que le mot de passe sera enregistré.`
                : "Ce lien n’est plus valable : il a expiré, ou il a déjà servi à changer un mot de passe."}
            </p>
          </div>

          {compte ? (
            <FormulaireReinitialisation jeton={decodeURIComponent(jeton)} />
          ) : (
            <div className="p-6 sm:p-7">
              <Link
                href="/mot-de-passe-oublie"
                className="font-medium text-nuit underline decoration-signal decoration-2 underline-offset-4 hover:text-signal-profond"
              >
                Demander un nouveau lien
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-brume">
          <Link
            href="/login"
            className="font-medium text-ivoire underline decoration-signal decoration-2 underline-offset-4"
          >
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
