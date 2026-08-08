import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { libelleTypePanne } from "@/lib/constants";
import { formaterDateHeure } from "@/lib/dates";
import { resteAPayer, selectionFacture } from "@/lib/facturation";
import { EntetePage, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import { LienBouton } from "@/components/ui/bouton";
import BoutonImpression from "@/components/ui/bouton-impression";
import { BadgeStatut, BadgeZone, Reference } from "@/components/ui/badges";
import DocumentFacture from "@/components/facturation/document-facture";
import RectificationFacture from "@/components/facturation/rectification-facture";

export const metadata: Metadata = { title: "Facture" };

/**
 * Fiche d'une facture, côté superviseur.
 *
 * C'est le seul endroit d'où l'on peut corriger ou annuler. Volontairement une
 * page à part et non un bouton dans un tableau : rectifier une facture demande
 * de la relire en entier, et une action de cette portée ne se déclenche pas au
 * milieu d'une liste de trente lignes.
 */
export default async function PageFactureSuperviseur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigerRole("SUPERVISEUR");
  const { id } = await params;

  const facture = await prisma.facture.findUnique({
    where: { id },
    select: {
      ...selectionFacture,
      intervention: {
        select: {
          id: true,
          typePanne: true,
          statut: true,
          dateFin: true,
          rapport: true,
          client: {
            select: {
              ville: true,
              zone: true,
              adresse: true,
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

  if (!facture) notFound();

  const reste = await resteAPayer(prisma, facture.id);
  const { intervention } = facture;

  // Le geste n'est offert que quand il est possible : une facture soldée ou
  // partiellement réglée ne se rectifie pas (voir lib/facturation.ts).
  const rectifiable =
    facture.statut === "A_PAYER" &&
    !facture.paiements.some((p) => p.statut === "CONFIRME");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={
          <>
            Intervention <Reference id={intervention.id} /> ·{" "}
            <BadgeStatut statut={intervention.statut} />
          </>
        }
        titre={`Facture ${facture.numero}`}
        description={`${libelleTypePanne(intervention.typePanne)} chez ${
          intervention.client.utilisateur.prenom
        } ${intervention.client.utilisateur.nom}`}
        actions={
          <>
            <BoutonImpression libelle="Imprimer la facture" />
            <LienBouton href="/superviseur/finances" variante="secondaire">
              Finances
            </LienBouton>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {/* Le superviseur relit exactement le document que l'abonné a reçu.
            Deux rendus différents de la même facture finiraient par diverger,
            et celui qui tient le mauvais aurait raison de s'en méfier. */}
        <div className="zone-impression border border-trait bg-white">
          <DocumentFacture
            facture={facture}
            resteAPayer={reste}
            intervention={intervention}
          />
        </div>

        <Panneau className="sans-impression">
          <TitrePanneau
            actions={<BadgeZone zone={intervention.client.zone} />}
          >
            Ce que le technicien a rapporté
          </TitrePanneau>
          <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Clôturée le</dt>
              <dd className="mt-0.5 text-nuit">
                {intervention.dateFin
                  ? formaterDateHeure(intervention.dateFin)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Secteur</dt>
              <dd className="mt-0.5 text-nuit">{intervention.client.zone}</dd>
            </div>
            {intervention.rapport && (
              <div className="sm:col-span-2">
                <dt className="eyebrow">Rapport</dt>
                <dd className="mt-1 leading-relaxed whitespace-pre-line text-ardoise">
                  {intervention.rapport}
                </dd>
              </div>
            )}
          </dl>
        </Panneau>

        <Panneau className="sans-impression">
          <TitrePanneau>Rectifier</TitrePanneau>
          <div className="p-5">
            {rectifiable ? (
              <RectificationFacture
                factureId={facture.id}
                lignes={facture.lignes}
              />
            ) : (
              <p className="text-sm text-ardoise">
                {facture.statut === "ANNULEE"
                  ? "Cette facture est annulée : elle ne peut plus être modifiée."
                  : facture.statut === "PAYEE"
                    ? "Cette facture est soldée. Corriger un montant déjà encaissé demanderait un avoir, que cette version ne gère pas encore."
                    : "Cette facture a reçu un règlement partiel : son montant ne peut plus changer sous les pieds de celui qui a déjà payé."}
              </p>
            )}
          </div>
        </Panneau>

        <p className="text-sm text-ardoise">
          <Link
            href="/superviseur/interventions"
            className="underline decoration-signal decoration-2 underline-offset-4"
          >
            Voir toutes les interventions
          </Link>
        </p>
      </div>
    </div>
  );
}
