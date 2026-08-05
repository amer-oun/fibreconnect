import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { ACCENTS } from "@/lib/constants";
import { EntetePage, EtatVide, Indicateur, Panneau } from "@/components/ui/surfaces";
import { NoteEtoiles } from "@/components/ui/note-etoiles";
import BoutonImpression from "@/components/ui/bouton-impression";
import { LienBouton } from "@/components/ui/bouton";
import VignetteTechnicien from "@/components/ui/vignette-technicien";
import PastilleOperateur from "@/components/ui/pastille-operateur";
import BasculeCompte from "@/components/techniciens/bascule-compte";

export const metadata: Metadata = { title: "Techniciens" };

export default async function EquipeTechniciens({
  searchParams,
}: {
  searchParams: Promise<{ operateur?: string; q?: string }>;
}) {
  await exigerRole("SUPERVISEUR");
  const { operateur, q } = await searchParams;

  const [techniciens, operateurs] = await Promise.all([
    prisma.technicien.findMany({
      where: {
        ...(operateur ? { operateurId: operateur } : {}),
        ...(q
          ? {
              OR: [
                { matricule: { contains: q } },
                { zone: { contains: q } },
                { specialite: { contains: q } },
                { utilisateur: { nom: { contains: q } } },
                { utilisateur: { prenom: { contains: q } } },
              ],
            }
          : {}),
      },
      orderBy: [{ operateur: { nom: "asc" } }, { matricule: "asc" }],
      select: {
        id: true,
        matricule: true,
        specialite: true,
        zone: true,
        disponible: true,
        photoUrl: true,
        operateur: { select: { nom: true } },
        utilisateur: {
          select: { nom: true, prenom: true, email: true, telephone: true, actif: true },
        },
        interventions: { select: { statut: true, noteClient: true } },
      },
    }),
    prisma.operateur.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, logoUrl: true },
    }),
  ]);

  const enrichis = techniciens.map((t) => {
    const enCours = t.interventions.filter((i) =>
      ["ASSIGNEE", "EN_COURS"].includes(i.statut),
    ).length;
    const terminees = t.interventions.filter((i) => i.statut === "TERMINEE").length;
    const notes = t.interventions
      .map((i) => i.noteClient)
      .filter((n): n is number => n !== null);
    return {
      ...t,
      enCours,
      terminees,
      note:
        notes.length > 0
          ? notes.reduce((a, b) => a + b, 0) / notes.length
          : null,
      nombreNotes: notes.length,
    };
  });

  const actifs = enrichis.filter((t) => t.utilisateur.actif).length;
  const filtre = Boolean(operateur || q);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre="Supervision"
        titre="Techniciens"
        description="L’équipe FibreConnect, réseau par réseau. Un compte désactivé ne peut plus se connecter à l’application."
        actions={
          <>
            <LienBouton href="/superviseur/techniciens/nouveau">
              Créer un compte technicien
            </LienBouton>
            <BoutonImpression libelle="Imprimer l’équipe" />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur libelle="Comptes actifs" valeur={actifs} accent={ACCENTS.succes} />
        <Indicateur
          libelle="Désactivés"
          valeur={enrichis.length - actifs}
          accent={ACCENTS.danger}
        />
        <Indicateur
          libelle="Indisponibles"
          valeur={enrichis.filter((t) => !t.disponible).length}
          accent={ACCENTS.attention}
          precision="congé, arrêt"
        />
        <Indicateur
          libelle="Charge totale"
          valeur={enrichis.reduce((s, t) => s + t.enCours, 0)}
          precision="interventions ouvertes"
        />
      </div>

      <Panneau>
        {/* Filtre simple : un lien par opérateur, pas de JavaScript nécessaire. */}
        <div className="sans-impression flex flex-wrap items-center gap-2 border-b border-trait px-4 py-3 sm:px-5">
          <span className="eyebrow mr-1">Réseau</span>
          <Link
            href="/superviseur/techniciens"
            className={`rounded-net border px-2.5 py-1 text-xs transition-colors ${
              !operateur
                ? "border-signal-profond bg-ivoire font-medium text-nuit"
                : "border-trait text-ardoise hover:border-ardoise"
            }`}
          >
            Tous
          </Link>
          {operateurs.map((o) => (
            <Link
              key={o.id}
              href={`/superviseur/techniciens?operateur=${o.id}`}
              className={`flex items-center gap-1.5 rounded-net border px-2.5 py-1 text-xs transition-colors ${
                operateur === o.id
                  ? "border-signal-profond bg-ivoire font-medium text-nuit"
                  : "border-trait text-ardoise hover:border-ardoise"
              }`}
            >
              <PastilleOperateur
                nom={o.nom}
                logoUrl={o.logoUrl}
                taille="petit"
              />
              {o.nom}
            </Link>
          ))}
        </div>

        {enrichis.length === 0 ? (
          <EtatVide
            titre={filtre ? "Aucun résultat" : "Aucun technicien enregistré"}
            message={
              filtre
                ? "Aucun technicien ne correspond à ce filtre."
                : "Créez le premier compte technicien pour commencer à affecter des interventions."
            }
            action={
              !filtre && (
                <LienBouton href="/superviseur/techniciens/nouveau">
                  Créer un compte technicien
                </LienBouton>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-trait">
            {enrichis.map((t) => (
              <li
                key={t.id}
                className={`border-l-2 px-4 py-4 transition-colors hover:bg-ivoire sm:px-5 ${
                  t.utilisateur.actif ? "border-l-transparent" : "border-l-critique"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <VignetteTechnicien
                      photoUrl={t.photoUrl}
                      prenom={t.utilisateur.prenom}
                      nom={t.utilisateur.nom}
                      taille="petit"
                    />

                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/superviseur/techniciens/${t.id}`}
                        className="font-display text-base font-semibold text-nuit underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-signal"
                      >
                        {t.utilisateur.prenom} {t.utilisateur.nom}
                      </Link>
                      <span className="font-mono text-xs text-ardoise">
                        {t.matricule}
                      </span>

                      {!t.utilisateur.actif && (
                        <span className="rounded-net border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          Compte désactivé
                        </span>
                      )}
                      {t.utilisateur.actif && !t.disponible && (
                        <span className="rounded-net border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Indisponible
                        </span>
                      )}
                    </div>

                    <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                      <div className="flex gap-1.5">
                        <dt className="text-brume">Réseau</dt>
                        <dd className="text-ardoise">{t.operateur.nom}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-brume">Zone</dt>
                        <dd className="text-ardoise">{t.zone}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-brume">Spécialité</dt>
                        <dd className="text-ardoise">{t.specialite}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-brume">Téléphone</dt>
                        <dd className="font-mono text-ardoise">
                          {t.utilisateur.telephone}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
                      <span className="text-ardoise">
                        <span className="font-mono font-medium text-nuit">
                          {t.enCours}
                        </span>{" "}
                        en cours
                      </span>
                      <span className="text-ardoise">
                        <span className="font-mono font-medium text-nuit">
                          {t.terminees}
                        </span>{" "}
                        terminées
                      </span>
                      {t.note !== null ? (
                        <span className="flex items-center gap-1.5 text-ardoise">
                          <NoteEtoiles note={Math.round(t.note)} taille="petit" />
                          <span className="font-mono">
                            {t.note.toFixed(1)} ({t.nombreNotes})
                          </span>
                        </span>
                      ) : (
                        <span className="text-brume italic">Pas encore noté</span>
                      )}
                    </div>
                    </div>
                  </div>

                  <div className="sans-impression shrink-0">
                    <BasculeCompte
                      technicienId={t.id}
                      actif={t.utilisateur.actif}
                      nom={`${t.utilisateur.prenom} ${t.utilisateur.nom}`}
                      interventionsOuvertes={t.enCours}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panneau>
    </div>
  );
}
