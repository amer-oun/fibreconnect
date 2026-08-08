/**
 * Snapshot of the SQLite database, into `sauvegardes/`.
 *
 * Run with `npm run sauvegarde`.
 *
 * **Uses `VACUUM INTO`, not a file copy.** Copying `dev.db` while the
 * application is running can capture a torn file: SQLite writes pages as it
 * goes, and a copy taken mid-transaction contains half of it. `VACUUM INTO`
 * asks SQLite itself for a consistent snapshot, which is safe with the server
 * up — and that is the only moment anyone ever thinks of making a backup.
 *
 * The snapshot is also compacted on the way out, so it is smaller than the
 * original.
 */

import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

/** Nombre de sauvegardes conservées. Au-delà, les plus anciennes s'effacent. */
const A_CONSERVER = 20;

const DOSSIER = path.join(process.cwd(), "sauvegardes");

/** `2026-08-08T16-04-32` — triable à l'œil comme à la machine. */
function horodatage() {
  return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

function formaterTaille(octets: number) {
  return octets < 1024 * 1024
    ? `${Math.round(octets / 1024)} Ko`
    : `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

async function main() {
  mkdirSync(DOSSIER, { recursive: true });

  const fichier = path.join(DOSSIER, `fibreconnect-${horodatage()}.db`);
  const prisma = new PrismaClient();

  try {
    // SQLite attend des séparateurs POSIX et des apostrophes doublées.
    const cible = fichier.split(path.sep).join("/").replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${cible}'`);
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    `Sauvegarde écrite : ${path.relative(process.cwd(), fichier)} (${formaterTaille(
      statSync(fichier).size,
    )})`,
  );

  // Rotation : une sauvegarde qui remplit le disque finit par être supprimée
  // en bloc, et c'est toujours la veille du jour où elle aurait servi.
  const anciennes = readdirSync(DOSSIER)
    .filter((n) => n.startsWith("fibreconnect-") && n.endsWith(".db"))
    .sort()
    .reverse()
    .slice(A_CONSERVER);

  for (const nom of anciennes) {
    unlinkSync(path.join(DOSSIER, nom));
  }
  if (anciennes.length > 0) {
    console.log(
      `${anciennes.length} sauvegarde(s) au-delà des ${A_CONSERVER} dernières supprimée(s).`,
    );
  }
}

main().catch((erreur) => {
  console.error("La sauvegarde a échoué :", erreur);
  process.exit(1);
});
