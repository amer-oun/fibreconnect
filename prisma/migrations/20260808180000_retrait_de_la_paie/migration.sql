-- Retrait de la paie des techniciens.
--
-- La remuneration des salaries est une affaire interne a la societe, traitee
-- par sa comptabilite. Cette application suit les interventions et l'argent que
-- l'ABONNE doit ; elle s'arrete la ou commence la paie. Une demi-paie — sans
-- cotisations, sans conges, sans bulletin conforme — est pire que pas de paie.
--
-- Le circuit des especes n'est PAS concerne : quand l'abonne regle en liquide,
-- cet argent appartient a la societe et le technicien doit le remettre. C'est
-- la suite du paiement du client, pas de la remuneration.

-- DropTable
DROP TABLE "BulletinPaie";

-- AlterTable : SQLite ne sait pas retirer une colonne d'une table qui porte des
-- index, il faut la reconstruire. Les cles etrangeres sont differees le temps
-- de la bascule, sinon la table temporaire casserait les references le temps
-- d'un instant.
PRAGMA defer_foreign_keys = ON;

PRAGMA foreign_keys = OFF;

CREATE TABLE "nouveau_Technicien" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "matricule" TEXT,
    "specialite" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    CONSTRAINT "Technicien_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "nouveau_Technicien" ("id", "utilisateurId", "matricule", "specialite", "zone", "disponible", "photoUrl")
SELECT "id", "utilisateurId", "matricule", "specialite", "zone", "disponible", "photoUrl"
FROM "Technicien";

DROP TABLE "Technicien";

ALTER TABLE "nouveau_Technicien" RENAME TO "Technicien";

CREATE UNIQUE INDEX "Technicien_utilisateurId_key" ON "Technicien"("utilisateurId");

CREATE UNIQUE INDEX "Technicien_matricule_key" ON "Technicien"("matricule");

CREATE INDEX "Technicien_zone_idx" ON "Technicien"("zone");

PRAGMA foreign_keys = ON;

PRAGMA defer_foreign_keys = OFF;
