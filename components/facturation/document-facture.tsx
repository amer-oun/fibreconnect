import {
  libelleMoyenPaiement,
  libelleTypePanne,
  STATUT_FACTURE_LABELS,
  type StatutFacture,
} from "@/lib/constants";
import { formaterMontant } from "@/lib/monnaie";
import { formaterDate, formaterDateHeure } from "@/lib/dates";
import { SOCIETE, mentionsCompletes, raisonSociale } from "@/lib/societe";
import type { FactureDetail } from "@/lib/facturation";
import { Marque } from "@/components/navigation/marque";

/**
 * The invoice as a document — the thing a subscriber prints and keeps.
 *
 * Deliberately unlike every other screen in the application: no panel, no
 * badge, no hairline grid. A document is read on its own terms, and the
 * interface chrome that helps someone navigate a list only gets in the way of
 * someone checking what they owe.
 *
 * Sized for A4 and laid out so the print rules in globals.css have nothing to
 * undo. What appears on paper is what appears on screen, minus the buttons.
 */
export default function DocumentFacture({
  facture,
  resteAPayer,
  intervention,
}: {
  facture: FactureDetail;
  /** En millimes, calculé côté serveur. */
  resteAPayer: number;
  intervention: {
    id: string;
    typePanne: string;
    dateFin: Date | null;
    client: {
      adresse: string;
      ville: string;
      numContrat: string;
      utilisateur: { nom: string; prenom: string; telephone: string };
    };
    technicien: {
      matricule: string | null;
      utilisateur: { nom: string; prenom: string };
    } | null;
  };
}) {
  const regles = facture.paiements.filter((p) => p.statut !== "ECHOUE");
  const annulee = facture.statut === "ANNULEE";
  const { client, technicien } = intervention;

  return (
    <article className="document mx-auto w-full max-w-[19cm] bg-white p-8 text-nuit sm:p-10">
      {/* En-tête ---------------------------------------------------------- */}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-nuit pb-6">
        <div>
          {/* `sombre={false}` : le document est sur fond blanc, contrairement
              au rail de navigation pour lequel le logotype a été dessiné. */}
          <Marque href="/client/dashboard" sombre={false} />
          <address className="mt-3 text-xs leading-relaxed text-ardoise not-italic">
            {raisonSociale}
            <br />
            {SOCIETE.adresse}
            <br />
            {SOCIETE.codePostal} {SOCIETE.ville}, {SOCIETE.pays}
            <br />
            {SOCIETE.telephone} · {SOCIETE.email}
          </address>
        </div>

        <div className="text-right">
          <p className="eyebrow">Facture</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight tabulaire">
            {facture.numero}
          </p>
          <p className="mt-2 text-xs text-ardoise">
            Émise le {formaterDate(facture.dateEmission)}
          </p>
          {annulee && (
            <p className="mt-2 inline-block border border-critique px-2 py-0.5 text-xs font-semibold tracking-wide text-critique uppercase">
              {STATUT_FACTURE_LABELS[facture.statut as StatutFacture]}
            </p>
          )}
        </div>
      </header>

      {/* Abonné et intervention ------------------------------------------- */}
      <div className="grid gap-8 border-b border-trait py-6 sm:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">Facturé à</p>
          <address className="text-sm leading-relaxed not-italic">
            <span className="font-semibold">
              {client.utilisateur.prenom} {client.utilisateur.nom}
            </span>
            <br />
            {client.adresse}
            <br />
            {client.ville}
            <br />
            <span className="text-ardoise">{client.utilisateur.telephone}</span>
          </address>
        </div>

        <div>
          <p className="eyebrow mb-2">Intervention</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ardoise">Objet</dt>
              <dd className="text-right">
                {libelleTypePanne(intervention.typePanne)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ardoise">Contrat</dt>
              <dd className="text-right font-mono text-xs">
                {client.numContrat}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ardoise">Référence</dt>
              <dd className="text-right font-mono text-xs">
                #{intervention.id.slice(-6).toUpperCase()}
              </dd>
            </div>
            {intervention.dateFin && (
              <div className="flex justify-between gap-4">
                <dt className="text-ardoise">Réalisée le</dt>
                <dd className="text-right">
                  {formaterDate(intervention.dateFin)}
                </dd>
              </div>
            )}
            {technicien && (
              <div className="flex justify-between gap-4">
                <dt className="text-ardoise">Technicien</dt>
                <dd className="text-right">
                  {technicien.utilisateur.prenom} {technicien.utilisateur.nom}
                  {technicien.matricule && (
                    <span className="ml-1.5 font-mono text-xs text-ardoise">
                      {technicien.matricule}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Détail ----------------------------------------------------------- */}
      <table className="mt-6 w-full text-sm">
        <caption className="sr-only">
          Détail de la facture {facture.numero}
        </caption>
        <thead>
          <tr className="border-b border-nuit">
            <th scope="col" className="pb-2 text-left eyebrow">
              Désignation
            </th>
            <th scope="col" className="pb-2 text-right eyebrow">
              Montant HT
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-trait">
          {facture.lignes.map((ligne) => (
            <tr key={ligne.id} className="break-inside-avoid">
              <td className="py-3 pr-6">{ligne.designation}</td>
              <td className="py-3 text-right tabulaire whitespace-nowrap">
                {formaterMontant(ligne.montant)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pt-4 text-left font-medium text-ardoise">
              Total hors taxes
            </th>
            <td className="pt-4 text-right tabulaire whitespace-nowrap">
              {formaterMontant(facture.montantHT)}
            </td>
          </tr>
          <tr>
            <th scope="row" className="py-1 text-left font-medium text-ardoise">
              TVA {Math.round(facture.tauxTva * 100)} %
            </th>
            <td className="py-1 text-right tabulaire whitespace-nowrap">
              {formaterMontant(facture.montantTva)}
            </td>
          </tr>
          <tr>
            <th scope="row" className="pb-3 text-left font-medium text-ardoise">
              Droit de timbre
            </th>
            <td className="pb-3 text-right tabulaire whitespace-nowrap">
              {formaterMontant(facture.timbreFiscal)}
            </td>
          </tr>
          <tr className="border-t border-nuit">
            <th scope="row" className="pt-3 text-left font-semibold">
              Total toutes taxes comprises
            </th>
            <td className="pt-3 text-right font-display text-xl font-bold tabulaire whitespace-nowrap">
              {formaterMontant(annulee ? 0 : facture.montantTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Rectification ---------------------------------------------------- */}
      {facture.motifRectification && (
        <p className="mt-6 border-l-2 border-nuit bg-ivoire px-4 py-3 text-sm">
          <span className="font-semibold">
            {annulee
              ? "Facture annulée par la société"
              : "Facture rectifiée par la société"}
          </span>
          {facture.dateRectification && (
            <span className="text-ardoise">
              {" "}
              le {formaterDate(facture.dateRectification)}
            </span>
          )}
          <span className="mt-1 block text-ardoise">
            {facture.motifRectification}
          </span>
        </p>
      )}

      {/* Règlements ------------------------------------------------------- */}
      {regles.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-2">Règlements</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-trait">
                <th scope="col" className="pb-1.5 text-left eyebrow">
                  Date
                </th>
                <th scope="col" className="pb-1.5 text-left eyebrow">
                  Moyen
                </th>
                <th scope="col" className="pb-1.5 text-left eyebrow">
                  Référence
                </th>
                <th scope="col" className="pb-1.5 text-right eyebrow">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trait">
              {regles.map((p) => (
                <tr key={p.id} className="break-inside-avoid">
                  <td className="py-2 whitespace-nowrap">
                    {formaterDate(p.dateConfirmation ?? p.dateCreation)}
                  </td>
                  <td className="py-2">
                    {libelleMoyenPaiement(p.moyen)}
                    {p.statut === "EN_ATTENTE" && (
                      <span className="ml-1.5 text-xs text-ardoise">
                        (en attente de confirmation)
                      </span>
                    )}
                    {p.technicien && (
                      <span className="mt-0.5 block text-xs text-ardoise">
                        Reçues par {p.technicien.utilisateur.prenom}{" "}
                        {p.technicien.utilisateur.nom}
                        {p.technicien.matricule && ` · ${p.technicien.matricule}`}
                      </span>
                    )}
                  </td>
                  <td className="py-2 font-mono text-xs text-ardoise">
                    {p.reference}
                  </td>
                  <td className="py-2 text-right tabulaire whitespace-nowrap">
                    {formaterMontant(p.montant)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Solde ------------------------------------------------------------ */}
      <p className="mt-6 flex flex-wrap items-baseline justify-between gap-4 border-t-2 border-nuit pt-4">
        <span className="font-display text-base font-semibold">
          {annulee
            ? "Aucun montant dû"
            : resteAPayer > 0
              ? "Reste à payer"
              : "Facture soldée"}
        </span>
        <span className="font-display text-2xl font-bold tabulaire">
          {formaterMontant(annulee ? 0 : resteAPayer)}
        </span>
      </p>
      {!annulee && resteAPayer === 0 && facture.datePaiement && (
        <p className="mt-1 text-right text-xs text-ardoise">
          Soldée le {formaterDateHeure(facture.datePaiement)}
        </p>
      )}

      {/* Pied de page ----------------------------------------------------- */}
      <footer className="mt-10 border-t border-trait pt-4 text-xs leading-relaxed text-ardoise">
        <p>
          {SOCIETE.activite} · {raisonSociale} · {SOCIETE.telephone}
        </p>
        {SOCIETE.matriculeFiscal && (
          <p className="mt-1">Matricule fiscal : {SOCIETE.matriculeFiscal}</p>
        )}
        {!mentionsCompletes && (
          // Sans cette phrase, le document ressemblerait à une facture fiscale
          // sans en être une. Voir lib/societe.ts.
          <p className="mt-2 font-medium text-nuit">
            Document de démonstration : le matricule fiscal ci-dessus est un
            numéro d’exemple et non celui d’une société réelle. Cette facture ne
            constitue pas une pièce fiscale.
          </p>
        )}
      </footer>
    </article>
  );
}
