import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  changerStatut,
  ErreurMetier,
  exigerProprieteTechnicien,
} from "@/lib/interventions";
import { prevenirDemarrage } from "@/lib/courriels";
import { exigerRoleApi, reponseOk, traiterErreur } from "@/lib/api";

/** Le technicien démarre une intervention qui lui est affectée. */
export async function POST(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("TECHNICIEN");
    const { id } = await params;

    const technicien = await prisma.technicien.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!technicien) {
      throw new ErreurMetier("Profil technicien introuvable.", 404);
    }

    // Un technicien ne peut pas démarrer l'intervention d'un collègue.
    await exigerProprieteTechnicien(id, technicien.id);

    await changerStatut({
      interventionId: id,
      vers: "EN_COURS",
      action: "DEMARRAGE",
      technicienId: technicien.id,
      commentaire: "Technicien sur place",
      champs: { dateDebut: new Date() },
    });

    after(() => prevenirDemarrage(id));

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
