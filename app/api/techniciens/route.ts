import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { ErreurMetier } from "@/lib/interventions";
import { nouveauTechnicienSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * The supervisor creates a technician account.
 *
 * Until now technicians only existed through the seed, which made the app
 * unusable for a real team. The account and its profile are created together,
 * in one transaction: never one without the other.
 */
export async function POST(requete: Request) {
  try {
    await exigerRoleApi("SUPERVISEUR");
    const donnees = nouveauTechnicienSchema.parse(await lireCorps(requete));
    const email = donnees.email.toLowerCase();

    const [emailPris, matriculePris, operateur] = await Promise.all([
      prisma.utilisateur.findUnique({ where: { email }, select: { id: true } }),
      prisma.technicien.findUnique({
        where: { matricule: donnees.matricule },
        select: { id: true },
      }),
      prisma.operateur.findUnique({
        where: { id: donnees.operateurId },
        select: { id: true },
      }),
    ]);

    if (emailPris) {
      throw new ErreurMetier(
        "Un compte existe déjà avec cette adresse e-mail.",
        409,
      );
    }
    if (matriculePris) {
      throw new ErreurMetier("Ce matricule est déjà attribué.", 409);
    }
    if (!operateur) {
      throw new ErreurMetier("Choisissez un réseau valide.");
    }

    const technicien = await prisma.technicien.create({
      data: {
        matricule: donnees.matricule,
        specialite: donnees.specialite,
        zone: donnees.zone,
        operateur: { connect: { id: operateur.id } },
        utilisateur: {
          create: {
            email,
            motDePasse: await bcrypt.hash(donnees.motDePasse, BCRYPT_ROUNDS),
            role: "TECHNICIEN",
            nom: donnees.nom,
            prenom: donnees.prenom,
            telephone: donnees.telephone,
          },
        },
      },
      select: { id: true },
    });

    return reponseOk({ id: technicien.id }, 201);
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
