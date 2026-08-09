-- Reinitialisation du mot de passe.
--
-- Deux colonnes seulement, pas de onzieme table : une demande en cours est un
-- etat du compte, pas une entite. Elle nait, dure une heure et disparait.
--
-- `jetonReset` contient l'empreinte SHA-256 du jeton, jamais le jeton. Une base
-- derobee ne doit pas livrer des liens de reinitialisation utilisables.
ALTER TABLE "Utilisateur" ADD COLUMN "jetonReset" TEXT;
ALTER TABLE "Utilisateur" ADD COLUMN "jetonResetExpire" DATETIME;

-- Le compte se retrouve par cette empreinte. SQLite traite les NULL comme
-- distincts les uns des autres : les comptes sans demande en cours -- c'est-a-dire
-- presque tous, presque toujours -- ne se genent pas entre eux.
CREATE UNIQUE INDEX "Utilisateur_jetonReset_key" ON "Utilisateur"("jetonReset");
