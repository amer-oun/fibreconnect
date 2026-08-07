import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { profilTechnicienSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * Le technicien met à jour son propre profil.
 *
 * Il ne peut modifier que ce qui le concerne au quotidien. Le matricule, la
 * zone et l'état du compte restent la main du superviseur : la zone décide
 * quelles pannes lui sont proposées, la choisir soi-même reviendrait à choisir
 * son secteur.
 */
export async function PATCH(requete: Request) {
  try {
    const utilisateur = await exigerRoleApi("TECHNICIEN");
    const donnees = profilTechnicienSchema.parse(await lireCorps(requete));

    const technicien = await prisma.technicien.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!technicien) {
      throw new ErreurMetier("Profil technicien introuvable.", 404);
    }

    await prisma.$transaction([
      prisma.technicien.update({
        where: { id: technicien.id },
        data: {
          specialite: donnees.specialite,
          disponible: donnees.disponible,
          photoUrl: donnees.photoUrl ?? null,
        },
      }),
      prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { telephone: donnees.telephone },
      }),
    ]);

    return reponseOk({ id: technicien.id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
