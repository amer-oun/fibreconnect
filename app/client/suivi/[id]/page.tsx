import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { libelleTypePanne } from "@/lib/constants";
import { formaterDateHeure, formaterDuree } from "@/lib/dates";
import {
  EntetePage,
  Panneau,
  TitrePanneau,
} from "@/components/ui/surfaces";
import { BadgePriorite, BadgeStatut, Reference } from "@/components/ui/badges";
import { LienBouton } from "@/components/ui/bouton";
import BoutonImpression from "@/components/ui/bouton-impression";
import { NoteEtoiles } from "@/components/ui/note-etoiles";
import VignetteTechnicien from "@/components/ui/vignette-technicien";
import TimelineIntervention from "@/components/timeline-intervention";
import BoutonAnnulation from "@/components/interventions/bouton-annulation";
import Image from "next/image";
import FormulaireNotation from "./formulaire-notation";

export const metadata: Metadata = { title: "Suivi de l’intervention" };

export default async function PageSuivi({
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

  const intervention = await prisma.intervention.findUnique({
    where: { id },
    select: {
      id: true,
      typePanne: true,
      description: true,
      statut: true,
      priorite: true,
      dateCreation: true,
      dateDebut: true,
      dateFin: true,
      rapport: true,
      noteClient: true,
      photoPanne: true,
      photoRapport: true,
      clientId: true,
      client: {
        select: {
          adresse: true,
          ville: true,
          numContrat: true,
          operateur: { select: { nom: true } },
        },
      },
      technicien: {
        select: {
          matricule: true,
          specialite: true,
          zone: true,
          photoUrl: true,
          utilisateur: { select: { nom: true, prenom: true, telephone: true } },
        },
      },
      historiques: {
        orderBy: { dateAction: "asc" },
        select: {
          id: true,
          action: true,
          ancienStatut: true,
          nouveauStatut: true,
          dateAction: true,
          commentaire: true,
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

  // Verification de propriete : un client ne consulte que ses interventions.
  if (!intervention || intervention.clientId !== client.id) notFound();

  const peutNoter =
    intervention.statut === "TERMINEE" && intervention.noteClient === null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={
          <>
            Intervention <Reference id={intervention.id} />
          </>
        }
        titre={libelleTypePanne(intervention.typePanne)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <BadgeStatut statut={intervention.statut} />
            <BadgePriorite priorite={intervention.priorite} />
          </span>
        }
        actions={
          <>
            <BoutonImpression libelle="Imprimer la fiche" />
            <BoutonAnnulation
              interventionId={intervention.id}
              statut={intervention.statut}
              role="CLIENT"
            />
            <LienBouton href="/client/dashboard" variante="secondaire">
              Mes demandes
            </LienBouton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Panneau className="zone-impression">
            <TitrePanneau>Ce que vous avez déclaré</TitrePanneau>
            <div className="p-5">
              <p className="leading-relaxed whitespace-pre-line text-nuit">
                {intervention.description}
              </p>
              {intervention.photoPanne && (
                <Image
                  src={intervention.photoPanne}
                  alt="Photo jointe à votre déclaration"
                  width={480}
                  height={360}
                  unoptimized
                  className="mt-4 max-h-72 w-auto rounded-net border border-trait object-contain"
                />
              )}

              <p className="mt-4 font-mono text-xs text-brume">
                Déclarée le {formaterDateHeure(intervention.dateCreation)}
              </p>
            </div>
          </Panneau>

          <Panneau className="zone-impression">
            <TitrePanneau>Avancement</TitrePanneau>
            <div className="p-5">
              <TimelineIntervention
                historiques={intervention.historiques}
                statut={intervention.statut}
              />
            </div>
          </Panneau>

          {intervention.rapport && (
            <Panneau className="zone-impression" accent>
              <TitrePanneau>Rapport du technicien</TitrePanneau>
              <div className="p-5">
                <p className="leading-relaxed whitespace-pre-line text-nuit">
                  {intervention.rapport}
                </p>
                {intervention.photoRapport && (
                  <Image
                    src={intervention.photoRapport}
                    alt="Photo du travail réalisé par le technicien"
                    width={480}
                    height={360}
                    unoptimized
                    className="mt-4 max-h-72 w-auto rounded-net border border-trait object-contain"
                  />
                )}
                {intervention.dateDebut && intervention.dateFin && (
                  <p className="mt-4 font-mono text-xs text-brume">
                    Durée d’intervention :{" "}
                    {formaterDuree(intervention.dateDebut, intervention.dateFin)}
                  </p>
                )}
              </div>
            </Panneau>
          )}

          {peutNoter && (
            <Panneau accent>
              <TitrePanneau>Noter l’intervention</TitrePanneau>
              <FormulaireNotation interventionId={intervention.id} />
            </Panneau>
          )}

          {intervention.noteClient !== null && (
            <Panneau>
              <TitrePanneau>Votre évaluation</TitrePanneau>
              <div className="flex items-center gap-3 p-5">
                <NoteEtoiles note={intervention.noteClient} />
                <span className="font-mono text-sm text-ardoise">
                  {intervention.noteClient}/5
                </span>
              </div>
            </Panneau>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <Panneau className="zone-impression">
            <TitrePanneau>Technicien</TitrePanneau>
            <div className="p-5">
              {intervention.technicien ? (
                <>
                  {/* Le visage avant la fiche : l'abonne doit pouvoir
                      reconnaitre la personne qui sonne a sa porte. */}
                  <div className="mb-4 flex items-center gap-3 border-b border-trait pb-4">
                    <VignetteTechnicien
                      photoUrl={intervention.technicien.photoUrl}
                      prenom={intervention.technicien.utilisateur.prenom}
                      nom={intervention.technicien.utilisateur.nom}
                    />
                    <p className="min-w-0 font-display font-semibold text-nuit">
                      {intervention.technicien.utilisateur.prenom}{" "}
                      {intervention.technicien.utilisateur.nom}
                    </p>
                  </div>

                  <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="eyebrow">Matricule</dt>
                    <dd className="mt-0.5 font-mono text-nuit">
                      {intervention.technicien.matricule}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Spécialité</dt>
                    <dd className="mt-0.5 text-ardoise">
                      {intervention.technicien.specialite}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Téléphone</dt>
                    <dd className="mt-0.5">
                      <a
                        href={`tel:${intervention.technicien.utilisateur.telephone.replace(/\s/g, "")}`}
                        className="font-mono text-nuit underline decoration-signal decoration-2 underline-offset-4"
                      >
                        {intervention.technicien.utilisateur.telephone}
                      </a>
                    </dd>
                  </div>
                  </dl>
                </>
              ) : (
                <p className="text-sm text-ardoise">
                  Aucun technicien n’a encore accepté votre demande. Les
                  techniciens de {intervention.client.operateur.nom} la voient
                  dès maintenant.
                </p>
              )}
            </div>
          </Panneau>

          <Panneau className="zone-impression">
            <TitrePanneau>Lieu d’intervention</TitrePanneau>
            <dl className="space-y-3 p-5 text-sm">
              <div>
                <dt className="eyebrow">Adresse</dt>
                <dd className="mt-0.5 text-nuit">
                  {intervention.client.adresse}
                  <br />
                  {intervention.client.ville}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Contrat</dt>
                <dd className="mt-0.5 font-mono text-nuit">
                  {intervention.client.numContrat}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Opérateur</dt>
                <dd className="mt-0.5 text-nuit">
                  {intervention.client.operateur.nom}
                </dd>
              </div>
            </dl>
          </Panneau>
        </aside>
      </div>
    </div>
  );
}
