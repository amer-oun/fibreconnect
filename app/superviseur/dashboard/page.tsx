import type { Metadata } from "next";

import { exigerRole } from "@/lib/session";
import { statistiquesSuperviseur } from "@/lib/statistiques";
import { STATUT_LABELS, type Statut } from "@/lib/constants";
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

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TableauDeBordSuperviseur() {
  await exigerRole("SUPERVISEUR");
  const stats = await statistiquesSuperviseur();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre="Supervision"
        titre="Tableau de bord"
        description="Vue d’ensemble des trois opérateurs : charge en cours, délais, qualité perçue."
        actions={
          <>
            <BoutonImpression libelle="Imprimer le rapport" />
            <LienBouton href="/superviseur/interventions" variante="secondaire">
              Affecter les interventions
            </LienBouton>
          </>
        }
      />

      {/* Chiffres-clés */}
      <div className="mb-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Indicateur
          libelle="Sans technicien"
          valeur={stats.enAttente}
          accent="#64748B"
          precision="en attente d’affectation"
        />
        <Indicateur
          libelle="En traitement"
          valeur={stats.enTraitement}
          accent="#F59E0B"
          precision="acceptées ou démarrées"
        />
        <Indicateur
          libelle="Taux de résolution"
          valeur={`${stats.tauxResolution.toFixed(0)} %`}
          accent="#16A34A"
          precision={`${stats.terminees} terminées sur ${stats.total}`}
        />
        <Indicateur
          libelle="Note moyenne"
          valeur={stats.noteMoyenne !== null ? stats.noteMoyenne.toFixed(1) : "—"}
          accent="#0891B2"
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
          precision="comptes actifs"
        />
        <Indicateur
          libelle="Abonnés"
          valeur={stats.nombreClients}
          precision="sur les 3 opérateurs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panneau className="lg:col-span-2">
          <TitrePanneau>
            Volume mensuel — déclarations et clôtures sur 6 mois
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
                  <th scope="col" className="px-4 py-2.5 text-right font-display text-xs font-semibold tracking-wide text-ardoise uppercase">
                    Techniciens
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
                    <td className="px-4 py-3 text-right font-mono text-ardoise">
                      {operateur.techniciens}
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
                  <td className="px-4 py-3 text-right font-mono font-medium text-nuit">
                    {stats.nombreTechniciens}
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
                backgroundColor:
                  { NOUVELLE: "#64748B", ASSIGNEE: "#2563EB", EN_COURS: "#F59E0B", TERMINEE: "#16A34A", ANNULEE: "#DC2626" }[
                    s.statut as Statut
                  ],
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
