-- Annulation d'un bulletin de paie.
--
-- L'unicite passe de (technicienId, mois) a (technicienId, mois, actif).
-- SQL considere deux NULL comme distincts dans un index unique : les bulletins
-- annules portent `actif = NULL` et peuvent donc s'empiler sur un meme mois,
-- tandis que les bulletins en vigueur portent tous `true` et restent uniques.
-- C'est ainsi qu'on ecrit « unique parmi les lignes actives » sans index
-- partiel, que Prisma ne sait pas declarer.

-- AlterTable
ALTER TABLE "BulletinPaie" ADD COLUMN "actif" BOOLEAN DEFAULT true;
ALTER TABLE "BulletinPaie" ADD COLUMN "motifAnnulation" TEXT;
ALTER TABLE "BulletinPaie" ADD COLUMN "dateAnnulation" DATETIME;
ALTER TABLE "BulletinPaie" ADD COLUMN "annulePar" TEXT;

-- Les bulletins deja enregistres sont en vigueur. SQLite remplit deja les
-- lignes existantes avec la valeur par defaut, cette mise a jour ne fait que
-- rendre l'intention explicite pour qui relit la migration.
UPDATE "BulletinPaie" SET "actif" = true WHERE "actif" IS NULL;

-- DropIndex
DROP INDEX "BulletinPaie_technicienId_mois_key";

-- CreateIndex
CREATE UNIQUE INDEX "BulletinPaie_technicienId_mois_actif_key" ON "BulletinPaie"("technicienId", "mois", "actif");
