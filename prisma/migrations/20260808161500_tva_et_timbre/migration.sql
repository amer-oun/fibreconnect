-- TVA et droit de timbre sur les factures.
--
-- Les lignes de facture deviennent hors taxes. `montantTotal` passe de « somme
-- des lignes » a « toutes taxes comprises », ce qui est bien ce que l'abonne
-- doit : c'est la valeur que lit deja toute la logique de reglement, elle n'a
-- donc pas de raison de changer de sens.
--
-- Les factures existantes sont reprises comme des montants HORS TAXES : leurs
-- lignes n'ont jamais contenu de taxe, on ne peut donc pas les reinterpreter
-- comme des montants TTC sans changer retroactivement ce que les abonnes
-- devaient. Leur total est donc recalcule en y ajoutant TVA et timbre.

-- AlterTable
ALTER TABLE "Facture" ADD COLUMN "montantHT" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Facture" ADD COLUMN "tauxTva" REAL NOT NULL DEFAULT 0.19;
ALTER TABLE "Facture" ADD COLUMN "montantTva" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Facture" ADD COLUMN "timbreFiscal" INTEGER NOT NULL DEFAULT 1000;

-- Le total actuel etait la somme des lignes : il devient le montant hors taxes.
UPDATE "Facture" SET "montantHT" = "montantTotal";

-- ROUND() de SQLite renvoie un flottant : CAST le ramene a l'entier de
-- millimes que tout le reste de l'application manipule.
UPDATE "Facture"
SET "montantTva" = CAST(ROUND("montantHT" * "tauxTva") AS INTEGER);

UPDATE "Facture"
SET "montantTotal" = "montantHT" + "montantTva" + "timbreFiscal";
