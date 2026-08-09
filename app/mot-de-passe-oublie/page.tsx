import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROLE_ACCUEIL } from "@/lib/constants";
import { DUREE_JETON_MINUTES } from "@/lib/reinitialisation";
import { utilisateurConnecte } from "@/lib/session";
import { Marque } from "@/components/navigation/marque";
import FormulaireDemande from "./formulaire-demande";

export const metadata: Metadata = { title: "Mot de passe oublié" };

/** Demande d'un lien de réinitialisation. Ouvert aux trois rôles. */
export default async function PageMotDePasseOublie() {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur) redirect(ROLE_ACCUEIL[utilisateur.role]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-nuit px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Marque />
        </div>

        <div className="rounded-bloc border border-trait bg-white">
          <div className="border-b border-trait px-6 py-6 sm:px-7">
            <h1 className="font-display text-xl font-bold tracking-tight text-nuit">
              Mot de passe oublié
            </h1>
            <p className="mt-1.5 text-sm text-ardoise">
              Indiquez votre adresse : vous recevrez un lien pour en choisir un
              nouveau. Il est valable {DUREE_JETON_MINUTES} minutes et ne sert
              qu’une fois.
            </p>
          </div>

          <FormulaireDemande />
        </div>

        <p className="mt-6 text-center text-sm text-brume">
          Vous vous en souvenez ?{" "}
          <Link
            href="/login"
            className="font-medium text-ivoire underline decoration-signal decoration-2 underline-offset-4"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
