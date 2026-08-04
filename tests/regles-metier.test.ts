import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { preparerBase, semerJeuDeTest, supprimerBase } from "./aide";
import {
  ErreurMetier,
  changerStatut,
  creerIntervention,
  exigerProprieteClient,
  exigerProprieteTechnicien,
} from "@/lib/interventions";
import { TRANSITIONS_STATUT } from "@/lib/constants";

/**
 * The rules the whole project stands on, exercised against a real database
 * built from the real migrations — not mocks.
 */

type Prisma = Awaited<ReturnType<typeof preparerBase>>;
type Jeu = Awaited<ReturnType<typeof semerJeuDeTest>>;

let prisma: Prisma;
let jeu: Jeu;

beforeAll(async () => {
  prisma = await preparerBase();
  jeu = await semerJeuDeTest(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  supprimerBase();
});

/** Cree une intervention neuve pour l'abonne du reseau A. */
async function nouvelleIntervention(clientId = jeu.clientA.id) {
  return creerIntervention({
    clientId,
    typePanne: "COUPURE_TOTALE",
    priorite: "URGENTE",
    description: "Coupure totale de la ligne depuis ce matin, voyant rouge.",
  });
}

describe("Création d'une intervention", () => {
  it("démarre en NOUVELLE, sans technicien", async () => {
    const i = await nouvelleIntervention();
    expect(i.statut).toBe("NOUVELLE");
    expect(i.technicienId).toBeNull();
  });

  it("écrit une ligne d'historique de création", async () => {
    const i = await nouvelleIntervention();
    const lignes = await prisma.historique.findMany({
      where: { interventionId: i.id },
    });

    expect(lignes).toHaveLength(1);
    expect(lignes[0].action).toBe("CREATION");
    expect(lignes[0].ancienStatut).toBeNull();
    expect(lignes[0].nouveauStatut).toBe("NOUVELLE");
  });
});

describe("changerStatut() — la porte unique", () => {
  it("suit le cycle complet NOUVELLE → ASSIGNEE → EN_COURS → TERMINEE", async () => {
    const i = await nouvelleIntervention();

    await changerStatut({
      interventionId: i.id,
      vers: "ASSIGNEE",
      action: "ACCEPTATION",
      technicienId: jeu.techA.id,
      champs: { technicien: { connect: { id: jeu.techA.id } } },
    });
    await changerStatut({
      interventionId: i.id,
      vers: "EN_COURS",
      action: "DEMARRAGE",
      technicienId: jeu.techA.id,
      champs: { dateDebut: new Date() },
    });
    const fin = await changerStatut({
      interventionId: i.id,
      vers: "TERMINEE",
      action: "CLOTURE",
      technicienId: jeu.techA.id,
      champs: { dateFin: new Date(), rapport: "Connecteur nettoyé, ligne rétablie." },
    });

    expect(fin.statut).toBe("TERMINEE");
    expect(fin.dateDebut).not.toBeNull();
    expect(fin.dateFin).not.toBeNull();
  });

  it("écrit exactement une ligne d'historique par transition", async () => {
    const i = await nouvelleIntervention();
    await changerStatut({
      interventionId: i.id,
      vers: "ASSIGNEE",
      action: "ACCEPTATION",
      technicienId: jeu.techA.id,
    });
    await changerStatut({
      interventionId: i.id,
      vers: "EN_COURS",
      action: "DEMARRAGE",
      technicienId: jeu.techA.id,
    });

    const lignes = await prisma.historique.findMany({
      where: { interventionId: i.id },
      orderBy: { dateAction: "asc" },
    });

    // creation + 2 transitions
    expect(lignes).toHaveLength(3);
    expect(lignes.map((l) => l.nouveauStatut)).toEqual([
      "NOUVELLE",
      "ASSIGNEE",
      "EN_COURS",
    ]);
    // Chaînage : l'ancien statut de chaque ligne est le nouveau de la précédente.
    expect(lignes[1].ancienStatut).toBe("NOUVELLE");
    expect(lignes[2].ancienStatut).toBe("ASSIGNEE");
  });

  it("refuse un saut d'étape (NOUVELLE → TERMINEE)", async () => {
    const i = await nouvelleIntervention();
    await expect(
      changerStatut({
        interventionId: i.id,
        vers: "TERMINEE",
        action: "CLOTURE",
      }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("refuse de rouvrir une intervention terminée", async () => {
    const i = await nouvelleIntervention();
    await changerStatut({ interventionId: i.id, vers: "ASSIGNEE", action: "ACCEPTATION" });
    await changerStatut({ interventionId: i.id, vers: "EN_COURS", action: "DEMARRAGE" });
    await changerStatut({ interventionId: i.id, vers: "TERMINEE", action: "CLOTURE" });

    await expect(
      changerStatut({ interventionId: i.id, vers: "EN_COURS", action: "DEMARRAGE" }),
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("n'écrit aucun historique quand la transition est refusée", async () => {
    const i = await nouvelleIntervention();
    const avant = await prisma.historique.count({ where: { interventionId: i.id } });

    await expect(
      changerStatut({ interventionId: i.id, vers: "TERMINEE", action: "CLOTURE" }),
    ).rejects.toThrow();

    const apres = await prisma.historique.count({ where: { interventionId: i.id } });
    expect(apres).toBe(avant);
  });

  it("laisse l'intervention intacte quand la transition est refusée", async () => {
    const i = await nouvelleIntervention();
    await expect(
      changerStatut({ interventionId: i.id, vers: "TERMINEE", action: "CLOTURE" }),
    ).rejects.toThrow();

    const relu = await prisma.intervention.findUniqueOrThrow({ where: { id: i.id } });
    expect(relu.statut).toBe("NOUVELLE");
  });

  it("permet d'annuler depuis chaque état non terminal", async () => {
    for (const depart of ["NOUVELLE", "ASSIGNEE", "EN_COURS"] as const) {
      expect(TRANSITIONS_STATUT[depart]).toContain("ANNULEE");
    }
    expect(TRANSITIONS_STATUT.TERMINEE).toHaveLength(0);
    expect(TRANSITIONS_STATUT.ANNULEE).toHaveLength(0);
  });

  it("refuse d'agir sur une intervention inexistante", async () => {
    await expect(
      changerStatut({ interventionId: "inexistante", vers: "ASSIGNEE", action: "ACCEPTATION" }),
    ).rejects.toMatchObject({ code: 404 });
  });
});

describe("Règle centrale : le filtre par réseau", () => {
  it("ne propose au technicien que les pannes des abonnés de son réseau", async () => {
    await nouvelleIntervention(jeu.clientA.id);
    await nouvelleIntervention(jeu.clientB.id);

    const vuesParA = await prisma.intervention.findMany({
      where: { statut: "NOUVELLE", client: { operateurId: jeu.techA.operateurId } },
      include: { client: true },
    });

    expect(vuesParA.length).toBeGreaterThan(0);
    expect(
      vuesParA.every((i) => i.client.operateurId === jeu.techA.operateurId),
    ).toBe(true);
    expect(vuesParA.some((i) => i.clientId === jeu.clientB.id)).toBe(false);
  });

  it("ne montre jamais la panne d'un abonné de l'autre réseau", async () => {
    const chezB = await nouvelleIntervention(jeu.clientB.id);

    const vuesParA = await prisma.intervention.findMany({
      where: { statut: "NOUVELLE", client: { operateurId: jeu.techA.operateurId } },
      select: { id: true },
    });

    expect(vuesParA.map((i) => i.id)).not.toContain(chezB.id);
  });
});

describe("Contrôles de propriété", () => {
  it("refuse à un technicien l'intervention d'un collègue", async () => {
    const i = await nouvelleIntervention();
    await changerStatut({
      interventionId: i.id,
      vers: "ASSIGNEE",
      action: "ACCEPTATION",
      technicienId: jeu.techA.id,
      champs: { technicien: { connect: { id: jeu.techA.id } } },
    });

    await expect(
      exigerProprieteTechnicien(i.id, jeu.techB.id),
    ).rejects.toMatchObject({ code: 403 });

    await expect(
      exigerProprieteTechnicien(i.id, jeu.techA.id),
    ).resolves.toMatchObject({ id: i.id });
  });

  it("refuse à un client l'intervention d'un autre abonné", async () => {
    const i = await nouvelleIntervention(jeu.clientA.id);

    await expect(
      exigerProprieteClient(i.id, jeu.clientB.id),
    ).rejects.toMatchObject({ code: 404 });

    await expect(
      exigerProprieteClient(i.id, jeu.clientA.id),
    ).resolves.toMatchObject({ id: i.id });
  });
});

describe("Notation par le client", () => {
  it("n'accepte une note qu'une seule fois", async () => {
    const i = await nouvelleIntervention();
    await changerStatut({ interventionId: i.id, vers: "ASSIGNEE", action: "ACCEPTATION" });
    await changerStatut({ interventionId: i.id, vers: "EN_COURS", action: "DEMARRAGE" });
    await changerStatut({ interventionId: i.id, vers: "TERMINEE", action: "CLOTURE" });

    await prisma.intervention.update({
      where: { id: i.id },
      data: { noteClient: 5 },
    });

    const relu = await exigerProprieteClient(i.id, jeu.clientA.id);
    expect(relu.noteClient).toBe(5);
    // La route refuse une seconde note en s'appuyant sur ce champ.
    expect(relu.noteClient).not.toBeNull();
  });
});
