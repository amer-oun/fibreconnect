import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { ErreurMetier } from "@/lib/interventions";
import { inscriptionSchema } from "@/lib/validations";
import { lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Client self-registration. Public on purpose — this is the only account a
 * visitor can create; technicians and supervisors are created by the operator.
 */
export async function POST(requete: Request) {
  try {
    const donnees = inscriptionSchema.parse(await lireCorps(requete));
    const email = donnees.email.toLowerCase();

    const [emailPris, contratPris, operateur] = await Promise.all([
      prisma.utilisateur.findUnique({ where: { email }, select: { id: true } }),
      prisma.client.findUnique({
        where: { numContrat: donnees.numContrat },
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
    if (contratPris) {
      throw new ErreurMetier(
        "Ce numéro de contrat est déjà rattaché à un compte.",
        409,
      );
    }
    if (!operateur) {
      throw new ErreurMetier("Choisissez un opérateur valide.");
    }

    const motDePasse = await bcrypt.hash(donnees.motDePasse, BCRYPT_ROUNDS);

    // Le compte et le profil abonné sont créés ensemble : jamais l'un sans l'autre.
    const client = await prisma.client.create({
      data: {
        adresse: donnees.adresse,
        ville: donnees.ville,
        zone: donnees.zone,
        numContrat: donnees.numContrat,
        operateur: { connect: { id: operateur.id } },
        utilisateur: {
          create: {
            email,
            motDePasse,
            role: "CLIENT",
            nom: donnees.nom,
            prenom: donnees.prenom,
            telephone: donnees.telephone,
          },
        },
      },
      select: { id: true },
    });

    return reponseOk({ id: client.id }, 201);
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
