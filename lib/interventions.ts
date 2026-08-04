import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  STATUT_LABELS,
  TRANSITIONS_STATUT,
  type Statut,
} from "@/lib/constants";

/**
 * The single door through which an intervention's status may change.
 *
 * No route, page or script updates `statut` directly. Going through here
 * guarantees three things at once, inside one transaction:
 *   1. the transition is legal (see TRANSITIONS_STATUT),
 *   2. the intervention row is updated,
 *   3. a matching Historique row is written.
 *
 * If any of the three fails, none of them happens.
 */

/** Erreur metier : message deja redige en francais, affichable tel quel. */
export class ErreurMetier extends Error {
  readonly code: number;

  constructor(message: string, code = 409) {
    super(message);
    this.name = "ErreurMetier";
    this.code = code;
  }
}

export type ActionHistorique =
  | "CREATION"
  | "ACCEPTATION"
  | "ASSIGNATION_SUPERVISEUR"
  | "REASSIGNATION"
  | "DEMARRAGE"
  | "CLOTURE"
  | "ANNULATION";

type ChangementStatut = {
  interventionId: string;
  vers: Statut;
  action: ActionHistorique;
  /** Technicien a l'origine de l'action, ou `null` (client, superviseur). */
  technicienId?: string | null;
  commentaire?: string | null;
  /** Champs a mettre a jour en meme temps que le statut. */
  champs?: Prisma.InterventionUpdateInput;
};

export async function changerStatut({
  interventionId,
  vers,
  action,
  technicienId = null,
  commentaire = null,
  champs = {},
}: ChangementStatut) {
  return prisma.$transaction(async (tx) => {
    const intervention = await tx.intervention.findUnique({
      where: { id: interventionId },
      select: { id: true, statut: true },
    });

    if (!intervention) {
      throw new ErreurMetier("Cette intervention n’existe pas.", 404);
    }

    const depuis = intervention.statut as Statut;
    const autorisees = TRANSITIONS_STATUT[depuis] ?? [];

    if (!autorisees.includes(vers)) {
      throw new ErreurMetier(
        `Une intervention « ${STATUT_LABELS[depuis] ?? depuis} » ne peut pas passer à « ${
          STATUT_LABELS[vers] ?? vers
        } ».`,
      );
    }

    const misAJour = await tx.intervention.update({
      where: { id: interventionId },
      data: { ...champs, statut: vers },
    });

    await tx.historique.create({
      data: {
        interventionId,
        technicienId,
        action,
        ancienStatut: depuis,
        nouveauStatut: vers,
        commentaire,
      },
    });

    return misAJour;
  });
}

/**
 * Creation d'une intervention par un client : statut NOUVELLE, aucun
 * technicien, et la premiere ligne d'historique, dans la meme transaction.
 */
export async function creerIntervention(donnees: {
  clientId: string;
  typePanne: string;
  priorite: string;
  description: string;
  photoPanne?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const intervention = await tx.intervention.create({
      data: {
        clientId: donnees.clientId,
        typePanne: donnees.typePanne,
        priorite: donnees.priorite,
        description: donnees.description,
        photoPanne: donnees.photoPanne ?? null,
        statut: "NOUVELLE",
      },
    });

    await tx.historique.create({
      data: {
        interventionId: intervention.id,
        action: "CREATION",
        ancienStatut: null,
        nouveauStatut: "NOUVELLE",
        commentaire: "Panne déclarée par le client",
      },
    });

    return intervention;
  });
}

/* -------------------------------------------------------------------------- */
/* Lectures partagees                                                         */
/* -------------------------------------------------------------------------- */

/** Tout ce qu'il faut pour afficher une ligne d'intervention. */
export const selectionListe = {
  id: true,
  typePanne: true,
  description: true,
  statut: true,
  priorite: true,
  dateCreation: true,
  dateDebut: true,
  dateFin: true,
  rapport: true,
  noteClient: true,
  photoPanne: true,
  photoRapport: true,
  client: {
    select: {
      id: true,
      ville: true,
      adresse: true,
      numContrat: true,
      utilisateur: { select: { nom: true, prenom: true, telephone: true } },
      operateur: { select: { id: true, nom: true } },
    },
  },
  technicien: {
    select: {
      id: true,
      matricule: true,
      zone: true,
      specialite: true,
      utilisateur: { select: { nom: true, prenom: true, telephone: true } },
    },
  },
} satisfies Prisma.InterventionSelect;

export type InterventionListe = Prisma.InterventionGetPayload<{
  select: typeof selectionListe;
}>;

/** Verifie qu'une intervention appartient bien au technicien qui agit. */
export async function exigerProprieteTechnicien(
  interventionId: string,
  technicienId: string,
) {
  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    select: { id: true, technicienId: true, statut: true },
  });

  if (!intervention) {
    throw new ErreurMetier("Cette intervention n’existe pas.", 404);
  }
  if (intervention.technicienId !== technicienId) {
    throw new ErreurMetier(
      "Cette intervention est affectée à un autre technicien.",
      403,
    );
  }
  return intervention;
}

/** Verifie qu'une intervention appartient bien au client qui agit. */
export async function exigerProprieteClient(
  interventionId: string,
  clientId: string,
) {
  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    select: { id: true, clientId: true, statut: true, noteClient: true },
  });

  if (!intervention || intervention.clientId !== clientId) {
    throw new ErreurMetier("Cette intervention n’existe pas.", 404);
  }
  return intervention;
}
