import { exigerRoleApi, traiterErreur } from "@/lib/api";
import { paieDuMois } from "@/lib/facturation";
import { montantPourTableur } from "@/lib/monnaie";
import { bornesDuMois } from "@/lib/dates";
import { construireCsv } from "@/lib/csv";

/**
 * Payroll for one calendar month, as a spreadsheet.
 *
 * "Espèces détenues" is the last column and stands apart on purpose: it is not
 * part of what the company owes, it is what the technician owes the company.
 * Anyone reading the file must be able to add up "À verser" without that figure
 * silently joining the total.
 */

const ENTETES = [
  "Matricule",
  "Technicien",
  "Zone",
  "Interventions terminées",
  "Montant facturé",
  "Salaire fixe",
  "Taux de commission",
  "Commission",
  "À verser",
  "Espèces détenues",
];

export async function GET(requete: Request) {
  try {
    await exigerRoleApi("SUPERVISEUR");

    const { debut, fin, cle } = bornesDuMois(
      new URL(requete.url).searchParams.get("mois"),
    );
    const paie = await paieDuMois(debut, fin);

    const lignes = paie.map((l) => [
      l.matricule ?? "",
      l.nom,
      l.zone,
      l.interventions,
      montantPourTableur(l.chiffreAffaires),
      montantPourTableur(l.salaireBase),
      // En pourcentage plutôt qu'en 0,15 : c'est ainsi qu'un taux se relit.
      `${Math.round(l.tauxCommission * 100)} %`,
      montantPourTableur(l.commission),
      montantPourTableur(l.total),
      montantPourTableur(l.especesEnMain),
    ]);

    return new Response(construireCsv(ENTETES, lignes), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="paie-${cle}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
