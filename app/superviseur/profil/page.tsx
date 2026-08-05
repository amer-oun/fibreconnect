import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { formaterDate } from "@/lib/dates";
import { EntetePage, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import FormulaireMotDePasse from "@/components/compte/formulaire-mot-de-passe";

export const metadata: Metadata = { title: "Mon compte" };

export default async function CompteSuperviseur() {
  const session = await exigerRole("SUPERVISEUR");

  const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      creeLe: true,
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <EntetePage
        titre="Mon compte"
        description="Vos identifiants de connexion à FibreConnect."
      />

      <div className="flex flex-col gap-6">
        <Panneau>
          <TitrePanneau>Identité</TitrePanneau>
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Nom</dt>
              <dd className="mt-1 text-sm font-medium text-nuit">
                {utilisateur.prenom} {utilisateur.nom}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Téléphone</dt>
              <dd className="mt-1 font-mono text-sm text-nuit">
                {utilisateur.telephone}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Adresse e-mail</dt>
              <dd className="mt-1 font-mono text-sm text-nuit">
                {utilisateur.email}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Compte créé le</dt>
              <dd className="mt-1 text-sm text-nuit">
                {formaterDate(utilisateur.creeLe)}
              </dd>
            </div>
          </dl>
        </Panneau>

        <Panneau accent>
          <TitrePanneau>Sécurité</TitrePanneau>
          <FormulaireMotDePasse />
        </Panneau>
      </div>
    </div>
  );
}
