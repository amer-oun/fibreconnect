-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interventionId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "montantTotal" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'A_PAYER',
    "dateEmission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datePaiement" DATETIME,
    CONSTRAINT "Facture_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factureId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factureId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "moyen" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "reference" TEXT NOT NULL,
    "technicienId" TEXT,
    "versementId" TEXT,
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateConfirmation" DATETIME,
    CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Paiement_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Paiement_versementId_fkey" FOREIGN KEY ("versementId") REFERENCES "Versement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Versement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicienId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "commentaire" TEXT,
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateConfirmation" DATETIME,
    "confirmePar" TEXT,
    CONSTRAINT "Versement_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Technicien" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "matricule" TEXT,
    "specialite" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "salaireBase" INTEGER NOT NULL DEFAULT 800000,
    "tauxCommission" REAL NOT NULL DEFAULT 0.15,
    CONSTRAINT "Technicien_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Technicien" ("disponible", "id", "matricule", "photoUrl", "specialite", "utilisateurId", "zone") SELECT "disponible", "id", "matricule", "photoUrl", "specialite", "utilisateurId", "zone" FROM "Technicien";
DROP TABLE "Technicien";
ALTER TABLE "new_Technicien" RENAME TO "Technicien";
CREATE UNIQUE INDEX "Technicien_utilisateurId_key" ON "Technicien"("utilisateurId");
CREATE UNIQUE INDEX "Technicien_matricule_key" ON "Technicien"("matricule");
CREATE INDEX "Technicien_zone_idx" ON "Technicien"("zone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Facture_interventionId_key" ON "Facture"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- CreateIndex
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");

-- CreateIndex
CREATE INDEX "LigneFacture_factureId_idx" ON "LigneFacture"("factureId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_reference_key" ON "Paiement"("reference");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE INDEX "Paiement_technicienId_idx" ON "Paiement"("technicienId");

-- CreateIndex
CREATE INDEX "Paiement_statut_idx" ON "Paiement"("statut");

-- CreateIndex
CREATE INDEX "Versement_technicienId_idx" ON "Versement"("technicienId");

-- CreateIndex
CREATE INDEX "Versement_statut_idx" ON "Versement"("statut");
