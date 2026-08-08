import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { resteAPayer, selectionFacture } from "@/lib/facturation";
import { LienBouton } from "@/components/ui/bouton";
import BoutonImpression from "@/components/ui/bouton-impression";
import DocumentFacture from "@/components/facturation/document-facture";

export const metadata: Metadata = { title: "Facture" };

/**
 * L'exemplaire de l'abonné, fait pour être imprimé ou enregistré en PDF.
 *
 * Une page à part et non un panneau de plus sur le suivi : le suivi raconte
 * l'avancement d'une panne, la facture est une pièce qu'on garde. Les mélanger
 * donnerait un document couvert de boutons dès qu'on l'imprime.
 *
 * La boîte d'impression du navigateur propose « Enregistrer au format PDF » sur
 * toutes les plateformes, ce qui évite d'embarquer une bibliothèque PDF pour un
 * document que le navigateur sait déjà produire.
 */
export default async function PageFactureClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const utilisateur = await exigerRole("CLIENT");
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: { id: true },
  });
  if (!client) notFound();

  const facture = await prisma.facture.findUnique({
    where: { id },
    select: {
      ...selectionFacture,
      intervention: {
        select: {
          id: true,
          clientId: true,
          typePanne: true,
          dateFin: true,
          client: {
            select: {
              adresse: true,
              ville: true,
              numContrat: true,
              utilisateur: {
                select: { nom: true, prenom: true, telephone: true },
              },
            },
          },
          technicien: {
            select: {
              matricule: true,
              utilisateur: { select: { nom: true, prenom: true } },
            },
          },
        },
      },
    },
  });

  // Propriété revérifiée ici : le proxy sait que la page est réservée aux
  // abonnés, il ne sait pas de qui est la facture.
  if (!facture || facture.intervention.clientId !== client.id) notFound();

  const reste = await resteAPayer(prisma, facture.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="sans-impression mb-6 flex flex-wrap justify-end gap-2">
        <BoutonImpression libelle="Imprimer ou enregistrer en PDF" />
        <LienBouton
          href={`/client/suivi/${facture.intervention.id}`}
          variante="secondaire"
        >
          Revenir au suivi
        </LienBouton>
      </div>

      <div className="zone-impression border border-trait">
        <DocumentFacture
          facture={facture}
          resteAPayer={reste}
          intervention={facture.intervention}
        />
      </div>
    </div>
  );
}
