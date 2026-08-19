/**
 * Runs before any test file, and therefore before lib/prisma.ts builds its
 * client: the singleton picks up the disposable test database, never the one
 * used for development.
 *
 * The suite needs PostgreSQL, like production — the schema declares that
 * provider, so a SQLite file would be refused before the first test ran.
 * The workflow supplies DATABASE_URL through a service container. To run the
 * tests locally, start a throwaway server first:
 *
 *   docker run --rm -d --name fc-test -p 5433:5432 \
 *     -e POSTGRES_PASSWORD=test -e POSTGRES_DB=fibreconnect_test postgres:16
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://postgres:test@localhost:5433/fibreconnect_test";
}

// Aucun test ne doit déposer de courriel sur le disque ni en envoyer un. Le
// test du transport SMTP règle lui-même cette variable, le temps de son cas.
process.env.COURRIER_TRANSPORT ??= "silencieux";
