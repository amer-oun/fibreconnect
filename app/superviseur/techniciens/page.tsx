import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { ACCENTS, ZONES, estZone } from "@/lib/constants";
import { EntetePage, EtatVide, Indicateur, Panneau } from "@/components/ui/surfaces";
import { BadgeCompte } from "@/components/ui/badges";
import { NoteEtoiles } from "@/components/ui/note-etoiles";
import BoutonImpression from "@/components/ui/bouton-impression";
import { LienBouton } from "@/components/ui/bouton";
import VignetteTechnicien from "@/components/ui/vignette-technicien";
import BasculeCompte from "@/components/techniciens/bascule-compte";

export const metadata: Metadata = { title: "Techniciens" };

export default async function EquipeTechniciens({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string; q?: string }>;
}) {
  await exigerRole("SUPERVISEUR");
  const { zone, q } = await searchParams;
  const zoneFiltre = zone && estZone(zone) ? zone : undefined;

  const [techniciens, clientsParZone] = await Promise.all([
    prisma.technicien.findMany({
      where: {
        ...(zoneFiltre ? { zone: zoneFiltre } : {}),
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
      // Les comptes a valider remontent en tete : c'est ce qui attend une
      // decision, et une liste doit montrer d'abord ce sur quoi on doit agir.
      orderBy: [{ zone: "asc" }, { matricule: "asc" }],
      select: {
        id: true,
        matricule: true,
        specialite: true,
        zone: true,
        disponible: true,
        photoUrl: true,
        utilisateur: {
          select: {
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            statutCompte: true,
            creeLe: true,
          },
        },
        interventions: { select: { statut: true, noteClient: true } },
      },
    }),
    prisma.client.groupBy({ by: ["zone"], _count: true }),
  ]);

  const enrichis = techniciens
    .map((t) => {
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
    })
    // Ce qui attend une décision passe devant.
    .sort((a, b) => {
      const rang = (s: string) => (s === "EN_ATTENTE" ? 0 : 1);
      return rang(a.utilisateur.statutCompte) - rang(b.utilisateur.statutCompte);
    });

  const actifs = enrichis.filter(
    (t) => t.utilisateur.statutCompte === "ACTIF",
  ).length;
  const aValider = enrichis.filter(
    (t) => t.utilisateur.statutCompte === "EN_ATTENTE",
  ).length;
  const filtre = Boolean(zoneFiltre || q);

  // Une zone qui a des abonnés mais aucun technicien actif est un trou dans
  // la couverture : les pannes qui y tombent ne sont proposées à personne.
  const zonesAvecTechnicien = new Set(
    techniciens
      .filter((t) => t.utilisateur.statutCompte === "ACTIF")
      .map((t) => t.zone),
  );
  const zonesDecouvertes = clientsParZone
    .filter((c) => !zonesAvecTechnicien.has(c.zone))
    .map((c) => ({ zone: c.zone, abonnes: c._count }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <EntetePage
        titre="Techniciens"
        description="L’équipe FibreConnect, zone par zone. Un compte désactivé ou en attente de validation ne peut pas se connecter à l’application."
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
          libelle="À valider"
          valeur={aValider}
          accent={ACCENTS.attention}
          precision="inscriptions reçues"
        />
        <Indicateur
          libelle="Zones couvertes"
          valeur={`${zonesAvecTechnicien.size}/${ZONES.length}`}
          accent={ACCENTS.signal}
        />
        <Indicateur
          libelle="Charge totale"
          valeur={enrichis.reduce((s, t) => s + t.enCours, 0)}
          precision="interventions ouvertes"
        />
      </div>

      {zonesDecouvertes.length > 0 && (
        <div
          role="status"
          className="mb-6 rounded-bloc border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-medium">
            {zonesDecouvertes.length === 1
              ? "Une zone n’a aucun technicien actif"
              : `${zonesDecouvertes.length} zones n’ont aucun technicien actif`}
          </p>
          <p className="mt-1 text-xs">
            {zonesDecouvertes
              .map((z) => `${z.zone} (${z.abonnes} abonné${z.abonnes > 1 ? "s" : ""})`)
              .join(" · ")}
            {" — "}
            les pannes qui y sont déclarées ne sont proposées à personne. Affectez-les
            à la main depuis la page Interventions, ou couvrez la zone.
          </p>
        </div>
      )}

      <Panneau>
        {/* Filtre simple : un lien par zone, pas de JavaScript nécessaire. */}
        <div className="sans-impression flex flex-wrap items-center gap-2 border-b border-trait px-4 py-3 sm:px-5">
          <span className="eyebrow mr-1">Zone</span>
          <Link
            href="/superviseur/techniciens"
            className={`rounded-net border px-2.5 py-1 text-xs transition-colors ${
              !zoneFiltre
                ? "border-signal-profond bg-ivoire font-medium text-nuit"
                : "border-trait text-ardoise hover:border-ardoise"
            }`}
          >
            Toutes
          </Link>
          {ZONES.map((z) => {
            const couverte = zonesAvecTechnicien.has(z);
            return (
              <Link
                key={z}
                href={`/superviseur/techniciens?zone=${encodeURIComponent(z)}`}
                className={`flex items-center gap-1.5 rounded-net border px-2.5 py-1 text-xs transition-colors ${
                  zoneFiltre === z
                    ? "border-signal-profond bg-ivoire font-medium text-nuit"
                    : "border-trait text-ardoise hover:border-ardoise"
                }`}
              >
                {/* Un point ambré marque une zone sans technicien actif. */}
                {!couverte && (
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full bg-alerte"
                  />
                )}
                {z}
              </Link>
            );
          })}
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
                /* Un compte desactive est en retrait, pas souligne de rouge :
                   il n'y a rien d'alarmant a signaler, seulement quelqu'un qui
                   ne travaille plus. Le badge dit le reste. */
                className={`px-4 py-4 transition-colors sm:px-5 ${
                  t.utilisateur.statutCompte === "ACTIF"
                    ? "hover:bg-ivoire"
                    : "bg-ivoire/70 text-ardoise"
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
                        {t.matricule ?? "sans matricule"}
                      </span>

                      <BadgeCompte statutCompte={t.utilisateur.statutCompte} />
                      {t.utilisateur.statutCompte === "ACTIF" &&
                        !t.disponible && (
                          <span className="rounded-net border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Indisponible
                          </span>
                        )}
                    </div>

                    <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                      <div className="flex gap-1.5">
                        <dt className="text-brume">Zone</dt>
                        <dd className="text-ardoise">
                          {t.zone}
                          {!zonesAvecTechnicien.has(t.zone) && (
                            <span className="ml-1.5 text-amber-700">
                              (non couverte)
                            </span>
                          )}
                        </dd>
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
                      statutCompte={t.utilisateur.statutCompte}
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
