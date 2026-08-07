import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { validationTechnicienSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * Le superviseur valide un technicien qui s'est inscrit lui-même.
 *
 * Un seul geste plutôt que trois : le matricule, la zone et l'ouverture du
 * compte partent ensemble, dans une transaction. Les séparer laisserait
 * exister un état intermédiaire — compte actif sans matricule, ou technicien
 * affecté à une zone sans pouvoir se connecter — qui ne veut rien dire.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;
    const { matricule, zone } = validationTechnicienSchema.parse(
      await lireCorps(requete),
    );

    const technicien = await prisma.technicien.findUnique({
      where: { id },
      select: {
        id: true,
        utilisateurId: true,
        utilisateur: { select: { statutCompte: true } },
      },
    });
    if (!technicien) {
      throw new ErreurMetier("Ce technicien n’existe pas.", 404);
    }
    if (technicien.utilisateur.statutCompte !== "EN_ATTENTE") {
      throw new ErreurMetier("Ce compte a déjà été traité.");
    }

    const matriculePris = await prisma.technicien.findUnique({
      where: { matricule },
      select: { id: true },
    });
    if (matriculePris && matriculePris.id !== id) {
      throw new ErreurMetier("Ce matricule est déjà attribué.", 409);
    }

    await prisma.$transaction([
      prisma.technicien.update({
        where: { id },
        data: { matricule, zone },
      }),
      prisma.utilisateur.update({
        where: { id: technicien.utilisateurId },
        data: { statutCompte: "ACTIF" },
      }),
    ]);

    return reponseOk({ id, matricule, zone });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
