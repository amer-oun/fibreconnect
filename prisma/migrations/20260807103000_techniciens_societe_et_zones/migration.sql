-- Les techniciens deviennent des employes de FibreConnect.
--
-- Trois changements lies :
--   1. `Technicien.operateurId` disparait : un technicien n'est plus habilite
--      sur un reseau, il couvre une zone geographique. `matricule` devient
--      nullable, car un technicien qui s'inscrit lui-meme n'en a pas encore.
--   2. `Client.zone` apparait : c'est desormais elle qui decide quel technicien
--      voit la panne. Les lignes existantes sont reprises depuis `ville`.
--   3. `Utilisateur.actif` (booleen) devient `statutCompte` (chaine), pour
--      distinguer un compte jamais valide d'un compte ferme par le superviseur.
--
-- SQLite ne sait pas modifier une colonne en place : chaque table est
-- reconstruite, remplie depuis l'ancienne, puis substituee.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- RedefineTable Utilisateur : actif -> statutCompte
CREATE TABLE "new_Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "statutCompte" TEXT NOT NULL DEFAULT 'ACTIF',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Utilisateur" ("id", "email", "motDePasse", "role", "nom", "prenom", "telephone", "statutCompte", "creeLe")
SELECT "id", "email", "motDePasse", "role", "nom", "prenom", "telephone",
       CASE WHEN "actif" = 1 THEN 'ACTIF' ELSE 'DESACTIVE' END,
       "creeLe"
FROM "Utilisateur";
DROP TABLE "Utilisateur";
ALTER TABLE "new_Utilisateur" RENAME TO "Utilisateur";
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

-- RedefineTable Client : ajout de `zone`, deduite de la ville existante
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "operateurId" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "numContrat" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    CONSTRAINT "Client_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Client_operateurId_fkey" FOREIGN KEY ("operateurId") REFERENCES "Operateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("id", "utilisateurId", "operateurId", "adresse", "ville", "zone", "numContrat", "latitude", "longitude")
SELECT "id", "utilisateurId", "operateurId", "adresse", "ville",
       -- Les villes deja connues tombent dans leur gouvernorat ; le reste est
       -- rattache a Tunis, que le superviseur corrigera depuis la fiche.
       CASE "ville"
         WHEN 'Ariana'    THEN 'Ariana'
         WHEN 'Ben Arous' THEN 'Ben Arous'
         WHEN 'Manouba'   THEN 'Manouba'
         WHEN 'Nabeul'    THEN 'Nabeul'
         WHEN 'Bizerte'   THEN 'Bizerte'
         WHEN 'Sousse'    THEN 'Sousse'
         WHEN 'Monastir'  THEN 'Monastir'
         WHEN 'Sfax'      THEN 'Sfax'
         ELSE 'Tunis'
       END,
       "numContrat", "latitude", "longitude"
FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_utilisateurId_key" ON "Client"("utilisateurId");
CREATE UNIQUE INDEX "Client_numContrat_key" ON "Client"("numContrat");
CREATE INDEX "Client_operateurId_idx" ON "Client"("operateurId");
CREATE INDEX "Client_zone_idx" ON "Client"("zone");

-- RedefineTable Technicien : suppression du lien vers Operateur, matricule nullable
CREATE TABLE "new_Technicien" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "matricule" TEXT,
    "specialite" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    CONSTRAINT "Technicien_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Technicien" ("id", "utilisateurId", "matricule", "specialite", "zone", "disponible", "photoUrl")
SELECT "id", "utilisateurId", "matricule", "specialite", "zone", "disponible", "photoUrl"
FROM "Technicien";
DROP TABLE "Technicien";
ALTER TABLE "new_Technicien" RENAME TO "Technicien";
CREATE UNIQUE INDEX "Technicien_utilisateurId_key" ON "Technicien"("utilisateurId");
CREATE UNIQUE INDEX "Technicien_matricule_key" ON "Technicien"("matricule");
CREATE INDEX "Technicien_zone_idx" ON "Technicien"("zone");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
