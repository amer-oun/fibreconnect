import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { prevenirAcceptation } from "@/lib/courriels";
import { exigerRoleApi, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Un technicien accepte une panne disponible.
 *
 * Regle centrale du projet, reverifiee ici et pas seulement dans l'affichage :
 * l'abonne doit se trouver dans la meme zone que le technicien.
 *
 * L'acceptation ne passe pas par `changerStatut()` mais par un
 * `updateMany` conditionnel, pour une raison precise : deux techniciens de la
 * meme zone voient la meme panne, et rien ne les empeche d'appuyer sur
 * « Accepter » a la meme seconde. Lire puis ecrire laisserait le second
 * ecraser le premier. La condition `statut: "NOUVELLE"` est evaluee par SQLite
 * au moment de l'ecriture : un seul `updateMany` renvoie 1, l'autre 0.
 */
export async function POST(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("TECHNICIEN");
    const { id } = await params;

    const technicien = await prisma.technicien.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true, zone: true, disponible: true },
    });
    if (!technicien) {
      throw new ErreurMetier("Profil technicien introuvable.", 404);
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
        technicienId: true,
        client: { select: { zone: true } },
      },
    });
    if (!intervention) {
      throw new ErreurMetier("Cette intervention n’existe pas.", 404);
    }

    if (intervention.client.zone !== technicien.zone) {
      throw new ErreurMetier(
        `Cette intervention se trouve dans la zone ${intervention.client.zone}, hors de votre secteur.`,
        403,
      );
    }

    // L'ordre compte : une intervention close n'est pas « deja prise », elle
    // est terminee. Tester le statut avant le technicien evite un message faux.
    if (intervention.statut !== "NOUVELLE") {
      throw new ErreurMetier(
        intervention.technicienId
          ? "Cette intervention est déjà prise en charge."
          : "Cette intervention n’est plus disponible.",
        409,
      );
    }

    const resultat = await prisma.$transaction(async (tx) => {
      // Le garde-fou : personne d'autre ne doit l'avoir prise entre la lecture
      // ci-dessus et cette ecriture.
      const { count } = await tx.intervention.updateMany({
        where: { id, statut: "NOUVELLE", technicienId: null },
        data: { statut: "ASSIGNEE", technicienId: technicien.id },
      });

      if (count === 0) return false;

      await tx.historique.create({
        data: {
          interventionId: id,
          technicienId: technicien.id,
          action: "ACCEPTATION",
          ancienStatut: "NOUVELLE",
          nouveauStatut: "ASSIGNEE",
          commentaire: "Intervention acceptée par le technicien",
        },
      });

      return true;
    });

    if (!resultat) {
      throw new ErreurMetier(
        "Un autre technicien vient de prendre cette intervention.",
        409,
      );
    }

    // Apres la reponse : l'abonne apprend qui vient et quand, sans que le
    // technicien attende un serveur de courrier devant son telephone.
    after(() => prevenirAcceptation(id));

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
