import { prisma } from "@/lib/prisma";
import {
  changerStatut,
  ErreurMetier,
  exigerProprieteTechnicien,
} from "@/lib/interventions";
import { rapportSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/** Clôture d'une intervention : le rapport est obligatoire. */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("TECHNICIEN");
    const { id } = await params;
    const { rapport } = rapportSchema.parse(await lireCorps(requete));

    const technicien = await prisma.technicien.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!technicien) {
      throw new ErreurMetier("Profil technicien introuvable.", 404);
    }

    await exigerProprieteTechnicien(id, technicien.id);

    await changerStatut({
      interventionId: id,
      vers: "TERMINEE",
      action: "CLOTURE",
      technicienId: technicien.id,
      commentaire: "Rapport enregistré, intervention clôturée",
      champs: { dateFin: new Date(), rapport },
    });

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
