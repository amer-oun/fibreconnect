import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { ErreurMetier } from "@/lib/interventions";
import { inscriptionTechnicienSchema } from "@/lib/validations";
import { lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Candidature d'un technicien.
 *
 * Le compte est créé en `EN_ATTENTE` : il existe, mais la connexion est
 * refusée tant que le superviseur ne l'a pas validé. Sans cela, n'importe qui
 * s'inscrirait comme technicien et verrait l'adresse des abonnés d'une zone.
 *
 * Aucun matricule n'est demandé ici — c'est un identifiant d'entreprise, il
 * s'attribue, il ne se choisit pas.
 */
export async function POST(requete: Request) {
  try {
    const donnees = inscriptionTechnicienSchema.parse(await lireCorps(requete));
    const email = donnees.email.toLowerCase();

    const emailPris = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true },
    });
    if (emailPris) {
      throw new ErreurMetier(
        "Un compte existe déjà avec cette adresse e-mail.",
        409,
      );
    }

    const technicien = await prisma.technicien.create({
      data: {
        specialite: donnees.specialite,
        zone: donnees.zone,
        // Pas encore de matricule : le superviseur l'attribue à la validation.
        matricule: null,
        // Indisponible tant que le compte n'est pas ouvert : sinon il
        // apparaîtrait comme libre dans la liste d'affectation.
        disponible: false,
        utilisateur: {
          create: {
            email,
            motDePasse: await bcrypt.hash(donnees.motDePasse, BCRYPT_ROUNDS),
            role: "TECHNICIEN",
            statutCompte: "EN_ATTENTE",
            nom: donnees.nom,
            prenom: donnees.prenom,
            telephone: donnees.telephone,
          },
        },
      },
      select: { id: true },
    });

    return reponseOk({ id: technicien.id, statutCompte: "EN_ATTENTE" }, 201);
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
