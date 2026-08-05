import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { EntetePage, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import FormulaireTechnicien from "./formulaire-technicien";

export const metadata: Metadata = { title: "Nouveau technicien" };

export default async function NouveauTechnicien() {
  await exigerRole("SUPERVISEUR");

  const operateurs = await prisma.operateur.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <EntetePage
        titre="Créer un compte technicien"
        description="Le compte et la fiche technicien sont créés ensemble. Le technicien pourra se connecter immédiatement avec le mot de passe que vous lui donnez."
      />

      <Panneau>
        <TitrePanneau>Nouveau technicien</TitrePanneau>
        <FormulaireTechnicien operateurs={operateurs} />
      </Panneau>
    </div>
  );
}
