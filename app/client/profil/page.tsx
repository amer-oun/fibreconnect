import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { formaterDate } from "@/lib/dates";
import { EntetePage, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import FormulaireMotDePasse from "@/components/compte/formulaire-mot-de-passe";
import FormulaireProfilClient from "./formulaire-profil-client";

export const metadata: Metadata = { title: "Mon compte" };

export default async function ProfilClient() {
  const utilisateur = await exigerRole("CLIENT");

  const client = await prisma.client.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: {
      adresse: true,
      ville: true,
      zone: true,
      numContrat: true,
      operateur: { select: { nom: true } },
      utilisateur: {
        select: {
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          creeLe: true,
        },
      },
    },
  });

  if (!client) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <EntetePage
          titre="Profil incomplet"
          description="Votre compte n’est rattaché à aucun contrat d’abonné. Contactez votre opérateur."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={`${client.operateur.nom} · ${client.numContrat}`}
        titre="Mon compte"
        description="Vos coordonnées servent au technicien qui se déplace chez vous. Tenez-les à jour."
      />

      <div className="flex flex-col gap-6">
        <Panneau>
          <TitrePanneau>Informations liées à votre contrat</TitrePanneau>
          <dl className="grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <dt className="eyebrow">Numéro de contrat</dt>
              <dd className="mt-1 font-mono text-sm text-nuit">
                {client.numContrat}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Opérateur</dt>
              <dd className="mt-1 text-sm text-nuit">{client.operateur.nom}</dd>
            </div>
            <div>
              <dt className="eyebrow">Client depuis</dt>
              <dd className="mt-1 text-sm text-nuit">
                {formaterDate(client.utilisateur.creeLe)}
              </dd>
            </div>
            <div className="sm:col-span-3">
              <dt className="eyebrow">Adresse e-mail</dt>
              <dd className="mt-1 font-mono text-sm text-nuit">
                {client.utilisateur.email}
              </dd>
            </div>
          </dl>
          <p className="border-t border-trait px-5 py-3 text-xs text-ardoise">
            Le numéro de contrat et l’opérateur figurent sur votre contrat
            d’abonnement : ils ne se modifient pas depuis l’application.
          </p>
        </Panneau>

        <Panneau accent>
          <TitrePanneau>Mes coordonnées</TitrePanneau>
          <FormulaireProfilClient
            valeurs={{
              prenom: client.utilisateur.prenom,
              nom: client.utilisateur.nom,
              telephone: client.utilisateur.telephone,
              adresse: client.adresse,
              ville: client.ville,
              zone: client.zone,
            }}
          />
        </Panneau>

        <Panneau>
          <TitrePanneau>Sécurité</TitrePanneau>
          <FormulaireMotDePasse />
        </Panneau>
      </div>
    </div>
  );
}
