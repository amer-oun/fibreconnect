import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { encaisserEspeces, exigerFactureDuTechnicien } from "@/lib/facturation";
import { encaissementSchema } from "@/lib/validations";
import { exigerRoleApi, lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Le technicien enregistre des especes recues sur place.
 *
 * L'encaissement est confirme d'emblee — l'argent a change de main — mais il
 * ouvre aussitot une dette du technicien envers la societe, que seul un
 * versement confirme viendra eteindre.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("TECHNICIEN");
    const { id } = await params;
    const { montant } = encaissementSchema.parse(await lireCorps(requete));

    const technicien = await prisma.technicien.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!technicien) {
      throw new ErreurMetier("Profil technicien introuvable.", 404);
    }

    await exigerFactureDuTechnicien(id, technicien.id);
    const paiement = await encaisserEspeces({
      factureId: id,
      technicienId: technicien.id,
      montant,
    });

    return reponseOk({ reference: paiement.reference, montant: paiement.montant });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
