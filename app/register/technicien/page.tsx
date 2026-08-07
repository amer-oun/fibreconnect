import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROLE_ACCUEIL } from "@/lib/constants";
import { utilisateurConnecte } from "@/lib/session";
import { Marque } from "@/components/navigation/marque";
import FormulaireInscriptionTechnicien from "./formulaire-inscription-technicien";

export const metadata: Metadata = { title: "Rejoindre l’équipe technique" };

/**
 * Candidature d'un technicien.
 *
 * Le compte est créé mais la connexion reste refusée jusqu'à validation par le
 * superviseur : sans ce filtre, n'importe qui s'inscrirait comme technicien et
 * verrait l'adresse et le téléphone des abonnés d'une zone entière.
 */
export default async function PageInscriptionTechnicien() {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur) redirect(ROLE_ACCUEIL[utilisateur.role]);

  return (
    <main className="min-h-screen bg-nuit px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-7 flex justify-center">
          <Marque />
        </div>

        <div className="rounded-bloc border border-trait bg-white">
          <div className="border-b border-trait px-6 py-6 sm:px-7">
            <h1 className="font-display text-xl font-bold tracking-tight text-nuit">
              Rejoindre l’équipe technique
            </h1>
            <p className="mt-1.5 text-sm text-ardoise">
              Votre candidature est examinée par le superviseur. Votre compte ne
              sera actif qu’une fois votre matricule attribué.
            </p>
          </div>

          <FormulaireInscriptionTechnicien />
        </div>

        <p className="mt-6 text-center text-sm text-brume">
          Vous êtes abonné et non technicien ?{" "}
          <Link
            href="/register"
            className="font-medium text-ivoire underline decoration-signal decoration-2 underline-offset-4"
          >
            Créer un compte client
          </Link>
        </p>
      </div>
    </main>
  );
}
