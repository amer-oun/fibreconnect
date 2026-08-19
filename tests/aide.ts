import { execSync } from "node:child_process";

/**
 * Test fixtures.
 *
 * Each run rebuilds the disposable database from the real migrations, so the
 * schema under test is exactly the one that ships — not a hand-written copy.
 * DATABASE_URL itself is set in tests/setup.ts, which vitest loads before any
 * test module and therefore before lib/prisma.ts builds its client.
 */

export async function preparerBase() {
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "pipe",
    env: process.env,
  });

  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });
}

/**
 * Nothing left to erase: a PostgreSQL database is not a file, and the next run
 * empties it before seeding. Kept so the afterAll hooks that already call it
 * stay valid.
 */
export function supprimerBase() {}

type Prisma = Awaited<ReturnType<typeof preparerBase>>;

/**
 * Jeu minimal : deux zones, deux techniciens, deux abonnes, un seul operateur.
 *
 * L'operateur est le meme pour les deux abonnes, volontairement : si la regle
 * centrale se laissait encore influencer par lui, les tests de zone
 * passeraient pour la mauvaise raison.
 */
export async function semerJeuDeTest(prisma: Prisma) {
  const operateur = await prisma.operateur.create({
    data: { nom: "Opérateur de test" },
  });

  const creerTechnicien = (nom: string, zone: string, matricule: string) =>
    prisma.technicien.create({
      data: {
        matricule,
        specialite: "Raccordement",
        zone,
        utilisateur: {
          create: {
            email: `${matricule.toLowerCase()}@test.tn`,
            motDePasse: "hache",
            role: "TECHNICIEN",
            nom,
            prenom: "Test",
            telephone: "+216 20 000 000",
          },
        },
      },
    });

  const creerClient = (nom: string, zone: string, contrat: string) =>
    prisma.client.create({
      data: {
        adresse: "1 rue de Test",
        ville: zone,
        zone,
        numContrat: contrat,
        operateur: { connect: { id: operateur.id } },
        utilisateur: {
          create: {
            email: `${contrat.toLowerCase()}@test.tn`,
            motDePasse: "hache",
            role: "CLIENT",
            nom,
            prenom: "Test",
            telephone: "+216 20 000 001",
          },
        },
      },
    });

  const [techA, techB, clientA, clientB] = await Promise.all([
    creerTechnicien("TechA", "Tunis", "A-001"),
    creerTechnicien("TechB", "Sfax", "B-001"),
    creerClient("ClientA", "Tunis", "CTR-A"),
    creerClient("ClientB", "Sfax", "CTR-B"),
  ]);

  return { operateur, techA, techB, clientA, clientB };
}
