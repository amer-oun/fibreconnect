-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Operateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "logoUrl" TEXT
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "operateurId" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "numContrat" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    CONSTRAINT "Client_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Client_operateurId_fkey" FOREIGN KEY ("operateurId") REFERENCES "Operateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Technicien" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "operateurId" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "specialite" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    CONSTRAINT "Technicien_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Technicien_operateurId_fkey" FOREIGN KEY ("operateurId") REFERENCES "Operateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "technicienId" TEXT,
    "superviseurId" TEXT,
    "typePanne" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "priorite" TEXT NOT NULL DEFAULT 'NORMALE',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "rapport" TEXT,
    "noteClient" INTEGER,
    CONSTRAINT "Intervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Intervention_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Intervention_superviseurId_fkey" FOREIGN KEY ("superviseurId") REFERENCES "Utilisateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Historique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interventionId" TEXT NOT NULL,
    "technicienId" TEXT,
    "action" TEXT NOT NULL,
    "ancienStatut" TEXT,
    "nouveauStatut" TEXT NOT NULL,
    "dateAction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaire" TEXT,
    CONSTRAINT "Historique_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Historique_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Operateur_nom_key" ON "Operateur"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Client_utilisateurId_key" ON "Client"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_numContrat_key" ON "Client"("numContrat");

-- CreateIndex
CREATE INDEX "Client_operateurId_idx" ON "Client"("operateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Technicien_utilisateurId_key" ON "Technicien"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Technicien_matricule_key" ON "Technicien"("matricule");

-- CreateIndex
CREATE INDEX "Technicien_operateurId_idx" ON "Technicien"("operateurId");

-- CreateIndex
CREATE INDEX "Intervention_statut_idx" ON "Intervention"("statut");

-- CreateIndex
CREATE INDEX "Intervention_clientId_idx" ON "Intervention"("clientId");

-- CreateIndex
CREATE INDEX "Intervention_technicienId_idx" ON "Intervention"("technicienId");

-- CreateIndex
CREATE INDEX "Historique_interventionId_idx" ON "Historique"("interventionId");
