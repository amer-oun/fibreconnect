-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "statutCompte" TEXT NOT NULL DEFAULT 'ACTIF',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jetonReset" TEXT,
    "jetonResetExpire" TIMESTAMP(3),

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operateur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "Operateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "operateurId" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "numContrat" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technicien" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "matricule" TEXT,
    "specialite" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,

    CONSTRAINT "Technicien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "technicienId" TEXT,
    "superviseurId" TEXT,
    "typePanne" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "priorite" TEXT NOT NULL DEFAULT 'NORMALE',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "rapport" TEXT,
    "noteClient" INTEGER,
    "photoPanne" TEXT,
    "photoRapport" TEXT,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "montantHT" INTEGER NOT NULL,
    "tauxTva" DOUBLE PRECISION NOT NULL,
    "montantTva" INTEGER NOT NULL,
    "timbreFiscal" INTEGER NOT NULL,
    "montantTotal" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'A_PAYER',
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datePaiement" TIMESTAMP(3),
    "motifRectification" TEXT,
    "dateRectification" TIMESTAMP(3),
    "rectifieePar" TEXT,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,

    CONSTRAINT "LigneFacture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "moyen" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "reference" TEXT NOT NULL,
    "detail" TEXT,
    "technicienId" TEXT,
    "versementId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateConfirmation" TIMESTAMP(3),

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Versement" (
    "id" TEXT NOT NULL,
    "technicienId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "commentaire" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateConfirmation" TIMESTAMP(3),
    "confirmePar" TEXT,

    CONSTRAINT "Versement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Historique" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "technicienId" TEXT,
    "action" TEXT NOT NULL,
    "ancienStatut" TEXT,
    "nouveauStatut" TEXT NOT NULL,
    "dateAction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaire" TEXT,

    CONSTRAINT "Historique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_jetonReset_key" ON "Utilisateur"("jetonReset");

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
CREATE INDEX "Client_zone_idx" ON "Client"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "Technicien_utilisateurId_key" ON "Technicien"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Technicien_matricule_key" ON "Technicien"("matricule");

-- CreateIndex
CREATE INDEX "Technicien_zone_idx" ON "Technicien"("zone");

-- CreateIndex
CREATE INDEX "Intervention_statut_idx" ON "Intervention"("statut");

-- CreateIndex
CREATE INDEX "Intervention_clientId_idx" ON "Intervention"("clientId");

-- CreateIndex
CREATE INDEX "Intervention_technicienId_idx" ON "Intervention"("technicienId");

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

-- CreateIndex
CREATE INDEX "Historique_interventionId_idx" ON "Historique"("interventionId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_operateurId_fkey" FOREIGN KEY ("operateurId") REFERENCES "Operateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technicien" ADD CONSTRAINT "Technicien_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_superviseurId_fkey" FOREIGN KEY ("superviseurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneFacture" ADD CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_versementId_fkey" FOREIGN KEY ("versementId") REFERENCES "Versement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versement" ADD CONSTRAINT "Versement_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historique" ADD CONSTRAINT "Historique_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historique" ADD CONSTRAINT "Historique_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien"("id") ON DELETE SET NULL ON UPDATE CASCADE;
