import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { libelleTypePanne } from "@/lib/constants";
import { formaterDate, formaterDateHeure, formaterDuree, heuresEntre } from "@/lib/dates";
import {
  EntetePage,
  EtatVide,
  Indicateur,
  Panneau,
  TitrePanneau,
} from "@/components/ui/surfaces";
import { BadgeStatut, Reference } from "@/components/ui/badges";
import { LienBouton } from "@/components/ui/bouton";
import { NoteEtoiles } from "@/components/ui/note-etoiles";
import BoutonImpression from "@/components/ui/bouton-impression";
import VignetteTechnicien from "@/components/ui/vignette-technicien";
import BasculeCompte from "@/components/techniciens/bascule-compte";

export const metadata: Metadata = { title: "Fiche technicien" };

export default async function FicheTechnicien({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigerRole("SUPERVISEUR");
  const { id } = await params;

  const technicien = await prisma.technicien.findUnique({
    where: { id },
    select: {
      id: true,
      matricule: true,
      specialite: true,
      zone: true,
      disponible: true,
      photoUrl: true,
      operateur: { select: { nom: true } },
      utilisateur: {
        select: {
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          actif: true,
          creeLe: true,
        },
      },
      interventions: {
        orderBy: { dateCreation: "desc" },
        select: {
          id: true,
          typePanne: true,
          statut: true,
          dateCreation: true,
          dateDebut: true,
          dateFin: true,
          rapport: true,
          noteClient: true,
          client: {
            select: {
              ville: true,
              utilisateur: { select: { nom: true, prenom: true } },
            },
          },
        },
      },
      historiques: {
        orderBy: { dateAction: "desc" },
        take: 30,
        select: {
          id: true,
          action: true,
          ancienStatut: true,
          nouveauStatut: true,
          dateAction: true,
          commentaire: true,
          intervention: { select: { id: true, typePanne: true } },
        },
      },
    },
  });

  if (!technicien) notFound();

  const interventions = technicien.interventions;
  const terminees = interventions.filter((i) => i.statut === "TERMINEE");
  const enCours = interventions.filter((i) =>
    ["ASSIGNEE", "EN_COURS"].includes(i.statut),
  );

  const durees = terminees
    .filter((i) => i.dateDebut && i.dateFin)
    .map((i) => heuresEntre(i.dateDebut!, i.dateFin!));
  const dureeMoyenne =
    durees.length > 0 ? durees.reduce((a, b) => a + b, 0) / durees.length : null;

  const notes = interventions
    .map((i) => i.noteClient)
    .filter((n): n is number => n !== null);
  const noteMoyenne =
    notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;

  const LIBELLES_ACTION: Record<string, string> = {
    CREATION: "Déclaration",
    ACCEPTATION: "Acceptation",
    ASSIGNATION_SUPERVISEUR: "Assignation par le superviseur",
    REASSIGNATION: "Réaffectation",
    DEMARRAGE: "Démarrage",
    CLOTURE: "Clôture",
    ANNULATION: "Annulation",
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={`${technicien.operateur.nom} · ${technicien.matricule}`}
        titre={`${technicien.utilisateur.prenom} ${technicien.utilisateur.nom}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {!technicien.utilisateur.actif && (
              <span className="rounded-net border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                Compte désactivé
              </span>
            )}
            {technicien.utilisateur.actif && !technicien.disponible && (
              <span className="rounded-net border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                Indisponible
              </span>
            )}
            <span>
              {technicien.specialite} · zone {technicien.zone}
            </span>
          </span>
        }
        vignette={
          <VignetteTechnicien
            photoUrl={technicien.photoUrl}
            prenom={technicien.utilisateur.prenom}
            nom={technicien.utilisateur.nom}
            taille="grand"
          />
        }
        actions={
          <>
            <BoutonImpression libelle="Imprimer la fiche" />
            <LienBouton href="/superviseur/techniciens" variante="secondaire">
              Retour à l’équipe
            </LienBouton>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-5 lg:grid-cols-5">
        <Indicateur libelle="En cours" valeur={enCours.length} accent="#F59E0B" />
        <Indicateur
          libelle="Terminées"
          valeur={terminees.length}
          accent="#16A34A"
        />
        <Indicateur
          libelle="Durée moyenne"
          valeur={dureeMoyenne !== null ? `${dureeMoyenne.toFixed(1)} h` : "—"}
        />
        <Indicateur
          libelle="Note moyenne"
          valeur={noteMoyenne !== null ? noteMoyenne.toFixed(1) : "—"}
          accent="#0891B2"
          precision={`${notes.length} avis`}
        />
        <Indicateur
          libelle="Dans l’équipe depuis"
          valeur={formaterDate(technicien.utilisateur.creeLe)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-6">
          <Panneau>
            <TitrePanneau>
              Interventions — {interventions.length} au total
            </TitrePanneau>

            {interventions.length === 0 ? (
              <EtatVide
                titre="Aucune intervention"
                message="Ce technicien n’a encore accepté aucune panne."
              />
            ) : (
              <ul className="divide-y divide-trait">
                {interventions.map((i) => (
                  <li key={i.id} className="px-4 py-3.5 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <BadgeStatut statut={i.statut} />
                      <span className="font-medium text-nuit">
                        {libelleTypePanne(i.typePanne)}
                      </span>
                      <Reference id={i.id} />
                    </div>
                    <p className="mt-1 text-xs text-ardoise">
                      {i.client.utilisateur.prenom} {i.client.utilisateur.nom} ·{" "}
                      {i.client.ville}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-brume">
                      <span>Déclarée {formaterDateHeure(i.dateCreation)}</span>
                      {i.dateDebut && i.dateFin && (
                        <span>Durée {formaterDuree(i.dateDebut, i.dateFin)}</span>
                      )}
                      {i.noteClient !== null && (
                        <span className="flex items-center gap-1.5">
                          <NoteEtoiles note={i.noteClient} taille="petit" />
                        </span>
                      )}
                    </div>
                    {i.rapport && (
                      <p className="mt-2 line-clamp-2 border-l-2 border-trait pl-3 text-xs leading-relaxed text-ardoise">
                        {i.rapport}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panneau>

          <Panneau>
            <TitrePanneau>Journal d’activité — 30 dernières actions</TitrePanneau>

            {technicien.historiques.length === 0 ? (
              <EtatVide
                titre="Journal vide"
                message="Aucune action enregistrée pour ce technicien."
              />
            ) : (
              <ul className="divide-y divide-trait">
                {technicien.historiques.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 sm:px-5"
                  >
                    <span className="text-sm text-nuit">
                      {LIBELLES_ACTION[h.action] ?? h.action}
                      <span className="ml-2 text-xs text-ardoise">
                        {libelleTypePanne(h.intervention.typePanne)}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-brume">
                      {formaterDateHeure(h.dateAction)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panneau>
        </div>

        <aside className="flex flex-col gap-6">
          <Panneau>
            <TitrePanneau>Coordonnées</TitrePanneau>
            <dl className="space-y-3 p-5 text-sm">
              <div>
                <dt className="eyebrow">Matricule</dt>
                <dd className="mt-0.5 font-mono text-nuit">
                  {technicien.matricule}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Opérateur</dt>
                <dd className="mt-0.5 text-nuit">{technicien.operateur.nom}</dd>
              </div>
              <div>
                <dt className="eyebrow">Adresse e-mail</dt>
                <dd className="mt-0.5 truncate font-mono text-xs text-nuit">
                  {technicien.utilisateur.email}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Téléphone</dt>
                <dd className="mt-0.5 font-mono text-nuit">
                  {technicien.utilisateur.telephone}
                </dd>
              </div>
            </dl>
          </Panneau>

          <Panneau accent className="sans-impression">
            <TitrePanneau>Accès à l’application</TitrePanneau>
            <div className="p-5">
              <p className="mb-4 text-sm text-ardoise">
                {technicien.utilisateur.actif
                  ? "Ce technicien peut se connecter et accepter des interventions."
                  : "Ce compte est désactivé : la connexion est refusée."}
              </p>
              <BasculeCompte
                technicienId={technicien.id}
                actif={technicien.utilisateur.actif}
                nom={`${technicien.utilisateur.prenom} ${technicien.utilisateur.nom}`}
                interventionsOuvertes={enCours.length}
              />
            </div>
          </Panneau>
        </aside>
      </div>
    </div>
  );
}
