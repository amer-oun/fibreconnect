import type { Metadata } from "next";
import Link from "next/link";

import { exigerRole } from "@/lib/session";
import { lireFenetre, statistiquesSuperviseur } from "@/lib/statistiques";
import { ACCENTS, STATUT_COULEURS, STATUT_LABELS, type Statut } from "@/lib/constants";
import { formaterMontant, formaterMontantCourt } from "@/lib/monnaie";
import { bilanFinancier } from "@/lib/facturation";
import {
  EntetePage,
  Indicateur,
  Panneau,
  TitrePanneau,
} from "@/components/ui/surfaces";
import { LienBouton } from "@/components/ui/bouton";
import BoutonImpression from "@/components/ui/bouton-impression";
import {
  GraphiqueCharge,
  GraphiqueStatuts,
  GraphiqueTypes,
  GraphiqueVolume,
} from "@/components/graphiques/graphiques-superviseur";
import SelecteurFenetre from "@/components/graphiques/selecteur-fenetre";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TableauDeBordSuperviseur({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  await exigerRole("SUPERVISEUR");
  const fenetre = lireFenetre((await searchParams).mois);
  const [stats, bilan] = await Promise.all([
    statistiquesSuperviseur(fenetre),
    bilanFinancier(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <EntetePage
        titre="Tableau de bord"
        description="Vue d’ensemble de l’activité de FibreConnect, couverture des zones comprise : charge en cours, délais, qualité perçue."
        actions={
          <>
            <BoutonImpression libelle="Imprimer le rapport" />
            <LienBouton href="/superviseur/interventions" variante="secondaire">
              Affecter les interventions
            </LienBouton>
          </>
        }
      />

      {/* Ce qui demande une décision passe avant les chiffres. */}
      {(stats.zonesDecouvertes.length > 0 ||
        stats.techniciensAValider > 0 ||
        stats.horsDelai > 0) && (
        <div
          role="status"
          className="mb-8 flex flex-col gap-2 rounded-bloc border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {stats.zonesDecouvertes.length > 0 && (
            <p>
              <span className="font-medium">
                {stats.zonesDecouvertes.length === 1
                  ? "Une zone n’a aucun technicien actif"
                  : `${stats.zonesDecouvertes.length} zones n’ont aucun technicien actif`}
              </span>{" "}
              — {stats.zonesDecouvertes.map((z) => z.zone).join(", ")}. Les pannes
              qui y sont déclarées ne sont proposées à personne.
            </p>
          )}
          {stats.horsDelai > 0 && (
            <p>
              <span className="font-medium">
                {stats.horsDelai === 1
                  ? "Une panne a dépassé son délai de prise en charge"
                  : `${stats.horsDelai} pannes ont dépassé leur délai de prise en charge`}
              </span>{" "}
              — personne ne les a encore acceptées.{" "}
              <Link
                href="/superviseur/interventions?retard=1"
                className="font-medium underline decoration-2 underline-offset-2"
              >
                Les affecter
              </Link>
            </p>
          )}
          {stats.techniciensAValider > 0 && (
            <p>
              <span className="font-medium">
                {stats.techniciensAValider} inscription
                {stats.techniciensAValider > 1 ? "s" : ""} de technicien en
                attente
              </span>{" "}
              — ces comptes ne peuvent pas se connecter avant votre validation.
            </p>
          )}
          <p>
            <Link
              href="/superviseur/techniciens"
              className="font-medium underline decoration-2 underline-offset-2"
            >
              Ouvrir la page Techniciens
            </Link>
          </p>
        </div>
      )}

      {/* L'argent en attente d'un geste : une remise a accuser, un virement a
          pointer. Sans ce rappel ici, la page Finances ne serait ouverte que
          par quelqu'un qui la cherche deja. */}
      {(bilan.remisesAConfirmer.nombre > 0 ||
        bilan.virementsAConfirmer.nombre > 0) && (
        <div
          role="status"
          className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-bloc border border-trait bg-white px-4 py-3 text-sm text-nuit"
        >
          {bilan.remisesAConfirmer.nombre > 0 && (
            <p>
              <span className="font-medium">
                {bilan.remisesAConfirmer.nombre} remise
                {bilan.remisesAConfirmer.nombre > 1 ? "s" : ""} d’espèces
              </span>{" "}
              en attente de votre accusé de réception —{" "}
              <span className="tabulaire">
                {formaterMontant(bilan.remisesAConfirmer.montant)}
              </span>
            </p>
          )}
          {bilan.virementsAConfirmer.nombre > 0 && (
            <p>
              <span className="font-medium">
                {bilan.virementsAConfirmer.nombre} virement
                {bilan.virementsAConfirmer.nombre > 1 ? "s" : ""} annoncé
                {bilan.virementsAConfirmer.nombre > 1 ? "s" : ""}
              </span>{" "}
              à pointer sur le relevé —{" "}
              <span className="tabulaire">
                {formaterMontant(bilan.virementsAConfirmer.montant)}
              </span>
            </p>
          )}
          <Link
            href="/superviseur/finances"
            className="font-medium underline decoration-signal decoration-2 underline-offset-4"
          >
            Ouvrir les finances
          </Link>
        </div>
      )}

      {/* Argent ---------------------------------------------------------- */}
      <div className="mb-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {/* Le chiffre d'affaires est le HORS TAXES : la TVA transite par la
            société sans lui appartenir, l'inclure gonflerait ce qu'elle gagne. */}
        <Indicateur
          libelle="Chiffre d’affaires"
          valeur={formaterMontantCourt(bilan.chiffreAffairesHT)}
          accent={ACCENTS.neutre}
          precision={`hors taxes · ${bilan.nombreFactures} facture${bilan.nombreFactures > 1 ? "s" : ""}`}
        />
        <Indicateur
          libelle="Encaissé"
          valeur={formaterMontantCourt(bilan.encaisse)}
          accent={ACCENTS.succes}
          precision="règlements confirmés"
        />
        <Indicateur
          libelle="Reste à recouvrer"
          valeur={formaterMontantCourt(bilan.enAttente)}
          accent={bilan.enAttente > 0 ? ACCENTS.attention : ACCENTS.neutre}
          precision="facturé, pas encore payé"
        />
        <Indicateur
          libelle="Espèces chez les techniciens"
          valeur={formaterMontantCourt(bilan.chezTechniciens)}
          accent={bilan.chezTechniciens > 0 ? ACCENTS.info : ACCENTS.neutre}
          precision="reçues, pas encore remises"
        />
      </div>

      {/* Chiffres-clés */}
      <div className="mb-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Indicateur
          libelle="Sans technicien"
          valeur={stats.enAttente}
          accent={stats.horsDelai > 0 ? ACCENTS.danger : ACCENTS.neutre}
          precision={
            stats.horsDelai > 0
              ? `dont ${stats.horsDelai} hors délai`
              : "toutes dans les délais"
          }
        />
        <Indicateur
          libelle="En traitement"
          valeur={stats.enTraitement}
          accent={ACCENTS.attention}
          precision="acceptées ou démarrées"
        />
        <Indicateur
          libelle="Taux de résolution"
          valeur={`${stats.tauxResolution.toFixed(0)} %`}
          accent={ACCENTS.succes}
          precision={`${stats.terminees} terminées sur ${stats.total}`}
        />
        <Indicateur
          libelle="Note moyenne"
          valeur={stats.noteMoyenne !== null ? stats.noteMoyenne.toFixed(1) : "—"}
          accent={ACCENTS.signal}
          precision={`${stats.nombreNotes} avis d’abonnés`}
        />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Indicateur
          libelle="Délai de prise en charge"
          valeur={
            stats.delaiMoyen !== null ? `${stats.delaiMoyen.toFixed(1)} h` : "—"
          }
          precision="déclaration → affectation"
        />
        <Indicateur
          libelle="Durée d’intervention"
          valeur={
            stats.dureeMoyenne !== null
              ? `${stats.dureeMoyenne.toFixed(1)} h`
              : "—"
          }
          precision="démarrage → clôture"
        />
        <Indicateur
          libelle="Techniciens"
          valeur={`${stats.techniciensActifs}/${stats.nombreTechniciens}`}
          precision={
            stats.techniciensAValider > 0
              ? `${stats.techniciensAValider} en attente de validation`
              : "comptes actifs"
          }
        />
        <Indicateur
          libelle="Abonnés"
          valeur={stats.nombreClients}
          precision="sur les 3 réseaux"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panneau className="lg:col-span-2">
          <TitrePanneau actions={<SelecteurFenetre courante={fenetre} />}>
            Volume mensuel — déclarations et clôtures
          </TitrePanneau>
          <div className="p-4 sm:p-5">
            <GraphiqueVolume donnees={stats.serieMensuelle} />
          </div>
        </Panneau>

        <Panneau>
          <TitrePanneau>Répartition par statut</TitrePanneau>
          <div className="p-4 sm:p-5">
            <GraphiqueStatuts donnees={stats.serieStatuts} />
          </div>
        </Panneau>

        <Panneau>
          <TitrePanneau>Types de panne les plus fréquents</TitrePanneau>
          <div className="p-4 sm:p-5">
            <GraphiqueTypes donnees={stats.serieTypes} />
          </div>
        </Panneau>

        <Panneau className="lg:col-span-2">
          <TitrePanneau
            actions={
              <LienBouton
                href="/superviseur/techniciens"
                variante="discret"
                taille="petit"
              >
                Voir l’équipe
              </LienBouton>
            }
          >
            Charge par technicien
          </TitrePanneau>
          <div className="p-4 sm:p-5">
            <GraphiqueCharge donnees={stats.chargeTechniciens} />
          </div>
        </Panneau>

        {/* Couverture des zones : la mesure qui dit si l'organisation tient. */}
        <Panneau className="lg:col-span-2">
          <TitrePanneau
            actions={
              <LienBouton
                href="/superviseur/techniciens"
                variante="discret"
                taille="petit"
              >
                Gérer l’équipe
              </LienBouton>
            }
          >
            Couverture par zone
          </TitrePanneau>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-trait text-left">
                  <th scope="col" className="px-4 py-2.5 font-display text-xs font-semibold tracking-wide text-ardoise uppercase sm:px-5">
                    Zone
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-display text-xs font-semibold tracking-wide text-ardoise uppercase">
                    Techniciens
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-display text-xs font-semibold tracking-wide text-ardoise uppercase">
                    Ouvertes
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-display text-xs font-semibold tracking-wide text-ardoise uppercase sm:px-5">
                    Interventions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-trait">
                {stats.couvertureZones.map((z) => (
                  <tr key={z.zone} className={z.couverte ? "" : "bg-amber-50/60"}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-nuit sm:px-5">
                      {z.zone}
                      {!z.couverte && (
                        <span className="ml-2 text-xs font-normal text-amber-800">
                          aucun technicien
                        </span>
                      )}
                    </th>
                    <td className="px-4 py-3 text-right font-mono text-ardoise">
                      {z.techniciens}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ardoise">
                      {z.ouvertes}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-nuit sm:px-5">
                      {z.interventions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panneau>

        {/* Table de repli : les mêmes chiffres, lisibles sans couleur. */}
        <Panneau className="lg:col-span-2">
          <TitrePanneau>Détail par opérateur</TitrePanneau>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-trait text-left">
                  <th scope="col" className="px-4 py-2.5 font-display text-xs font-semibold tracking-wide text-ardoise uppercase sm:px-5">
                    Opérateur
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-display text-xs font-semibold tracking-wide text-ardoise uppercase">
                    Abonnés
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-display text-xs font-semibold tracking-wide text-ardoise uppercase sm:px-5">
                    Interventions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-trait">
                {stats.repartitionOperateurs.map((operateur) => (
                  <tr key={operateur.id}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-nuit sm:px-5">
                      {operateur.nom}
                    </th>
                    <td className="px-4 py-3 text-right font-mono text-ardoise">
                      {operateur.clients}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-nuit sm:px-5">
                      {operateur.interventions}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-trait">
                  <th scope="row" className="px-4 py-3 text-left font-display font-semibold text-nuit sm:px-5">
                    Total
                  </th>
                  <td className="px-4 py-3 text-right font-mono font-medium text-nuit">
                    {stats.nombreClients}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-nuit sm:px-5">
                    {stats.total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panneau>
      </div>

      {/* Rappel textuel des statuts : l'identité ne repose jamais sur la couleur seule. */}
      <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ardoise">
        {stats.serieStatuts.map((s) => (
          <span key={s.statut} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2"
              style={{
                backgroundColor: STATUT_COULEURS[s.statut as Statut].hex,
              }}
            />
            {STATUT_LABELS[s.statut as Statut]}
            <span className="font-mono text-nuit">{s.valeur}</span>
          </span>
        ))}
      </p>
    </div>
  );
}
