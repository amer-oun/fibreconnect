import path from "node:path";

/**
 * Runs before any test file, and therefore before lib/prisma.ts builds its
 * client: the singleton picks up the disposable test database, never dev.db.
 */
export const FICHIER_TEST = path.join(process.cwd(), "prisma", "test.db");

// SQLite attend des séparateurs POSIX, y compris sous Windows.
process.env.DATABASE_URL = `file:${FICHIER_TEST.split(path.sep).join("/")}`;

// Aucun test ne doit déposer de courriel sur le disque ni en envoyer un. Le
// test du transport SMTP règle lui-même cette variable, le temps de son cas.
process.env.COURRIER_TRANSPORT ??= "silencieux";
