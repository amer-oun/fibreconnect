import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { ROLE_ACCUEIL } from "@/lib/constants";
import { utilisateurConnecte } from "@/lib/session";
import { Marque } from "@/components/navigation/marque";
import FormulaireInscription from "./formulaire-inscription";

export const metadata: Metadata = { title: "Créer un compte client" };

/** Inscription réservée aux abonnés : les autres comptes sont créés en interne. */
export default async function PageInscription() {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur) redirect(ROLE_ACCUEIL[utilisateur.role]);

  const operateurs = await prisma.operateur.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <main className="min-h-screen bg-nuit px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-7 flex justify-center">
          <Marque />
        </div>

        <div className="rounded-bloc border border-trait bg-white">
          <div className="border-b border-trait px-6 py-6 sm:px-7">
            <h1 className="font-display text-xl font-bold tracking-tight text-nuit">
              Créer un compte client
            </h1>
            <p className="mt-1.5 text-sm text-ardoise">
              Réservé aux abonnés. Les comptes techniciens et superviseurs sont
              créés par l’opérateur.
            </p>
          </div>

          <FormulaireInscription operateurs={operateurs} />
        </div>

        <p className="mt-6 text-center text-sm text-brume">
          Vous avez déjà un compte ?{" "}
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
