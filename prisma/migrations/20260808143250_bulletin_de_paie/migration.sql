-- CreateTable
CREATE TABLE "BulletinPaie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicienId" TEXT NOT NULL,
    "mois" TEXT NOT NULL,
    "salaireBase" INTEGER NOT NULL,
    "tauxCommission" REAL NOT NULL,
    "interventions" INTEGER NOT NULL,
    "chiffreAffaires" INTEGER NOT NULL,
    "commission" INTEGER NOT NULL,
    "montantTotal" INTEGER NOT NULL,
    "dateVersement" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versePar" TEXT NOT NULL,
    "commentaire" TEXT,
    CONSTRAINT "BulletinPaie_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BulletinPaie_mois_idx" ON "BulletinPaie"("mois");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinPaie_technicienId_mois_key" ON "BulletinPaie"("technicienId", "mois");
