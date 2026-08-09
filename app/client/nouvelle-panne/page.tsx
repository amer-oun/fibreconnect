import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { EntetePage, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import FormulairePanne from "./formulaire-panne";

export const metadata: Metadata = { title: "Déclarer une panne" };

export default async function PageNouvellePanne() {
  const utilisateur = await exigerRole("CLIENT");

  const client = await prisma.client.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: {
      adresse: true,
      ville: true,
      numContrat: true,
      operateur: { select: { nom: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <EntetePage
        titre="Déclarer une panne"
        description="Votre déclaration part immédiatement chez les techniciens FibreConnect de votre secteur. Le prix du déplacement vous est annoncé ci-dessous, avant de valider."
      />

      {client && (
        <Panneau className="mb-6" accent>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <p className="eyebrow">Opérateur</p>
              <p className="mt-1 text-sm font-medium text-nuit">
                {client.operateur.nom}
              </p>
            </div>
            <div>
              <p className="eyebrow">Contrat</p>
              <p className="mt-1 font-mono text-sm text-nuit">
                {client.numContrat}
              </p>
            </div>
            <div>
              <p className="eyebrow">Adresse d’intervention</p>
              <p className="mt-1 text-sm text-nuit">
                {client.adresse}, {client.ville}
              </p>
            </div>
          </div>
        </Panneau>
      )}

      <Panneau>
        <TitrePanneau>Décrivez le problème</TitrePanneau>
        <FormulairePanne />
      </Panneau>
    </div>
  );
}
