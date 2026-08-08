import { libelleMoyenPaiement } from "@/lib/constants";
import { formaterMontant } from "@/lib/monnaie";
import { formaterDateHeure } from "@/lib/dates";
import type { FactureDetail } from "@/lib/facturation";
import { Panneau, TitrePanneau } from "@/components/ui/surfaces";
import { BadgeFacture, BadgePaiement } from "@/components/ui/badges";

/**
 * The invoice, shown the same way to everyone.
 *
 * One component for the subscriber, the technician and the supervisor: three
 * renderings of one invoice would eventually disagree on a total, and the
 * person holding the odd one out would be right to distrust the whole thing.
 *
 * Amounts are right-aligned and tabular so a column of figures can be read
 * down rather than word by word.
 */
export default function PanneauFacture({
  facture,
  resteAPayer,
  action,
}: {
  facture: FactureDetail;
  /** En millimes. Calculé côté serveur, jamais dans le navigateur. */
  resteAPayer: number;
  /** Bouton de paiement ou d'encaissement, selon qui regarde. */
  action?: React.ReactNode;
}) {
  const regles = facture.paiements.filter((p) => p.statut !== "ECHOUE");

  return (
    <Panneau className="zone-impression" accent={resteAPayer > 0}>
      <TitrePanneau actions={<BadgeFacture statut={facture.statut} />}>
        Facture {facture.numero}
      </TitrePanneau>

      <div className="p-5">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Détail de la facture {facture.numero}
          </caption>
          <thead>
            <tr className="border-b border-trait">
              <th scope="col" className="pb-2 text-left eyebrow">
                Désignation
              </th>
              <th scope="col" className="pb-2 text-right eyebrow">
                Montant
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-trait">
            {facture.lignes.map((ligne) => (
              <tr key={ligne.id}>
                <td className="py-2.5 pr-4 text-nuit">{ligne.designation}</td>
                <td className="py-2.5 text-right text-nuit tabulaire">
                  {formaterMontant(ligne.montant)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-nuit">
              <th scope="row" className="pt-3 text-left font-semibold text-nuit">
                Total
              </th>
              <td className="pt-3 text-right font-display text-lg font-bold text-nuit tabulaire">
                {formaterMontant(facture.montantTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-4 font-mono text-xs text-brume">
          Émise le {formaterDateHeure(facture.dateEmission)}
          {facture.datePaiement &&
            ` · soldée le ${formaterDateHeure(facture.datePaiement)}`}
        </p>

        {regles.length > 0 && (
          <div className="mt-5 border-t border-trait pt-4">
            <p className="eyebrow mb-2">Règlements</p>
            <ul className="space-y-2 text-sm">
              {regles.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-2">
                  <span className="tabulaire font-medium text-nuit">
                    {formaterMontant(p.montant)}
                  </span>
                  <span className="text-ardoise">
                    {libelleMoyenPaiement(p.moyen)}
                    {p.technicien &&
                      ` — reçues par ${p.technicien.utilisateur.prenom} ${p.technicien.utilisateur.nom}`}
                  </span>
                  <BadgePaiement statut={p.statut} />
                  <span className="font-mono text-xs text-brume">
                    {p.reference}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {resteAPayer > 0 && resteAPayer !== facture.montantTotal && (
          <p className="mt-4 text-sm text-ardoise">
            Reste à payer :{" "}
            <span className="tabulaire font-semibold text-nuit">
              {formaterMontant(resteAPayer)}
            </span>
          </p>
        )}

        {action && <div className="mt-5">{action}</div>}
      </div>
    </Panneau>
  );
}
