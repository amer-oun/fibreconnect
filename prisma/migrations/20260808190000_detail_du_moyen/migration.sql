-- Trace du moyen de paiement sur le recu : « Visa ••••4242 », « D17 ••••1234 ».
--
-- Compose par le serveur a partir de la marque et des quatre derniers chiffres.
-- Le numero complet ne quitte jamais le navigateur : seul un prestataire de
-- paiement agree a le droit de le conserver, ce que cette societe n'est pas.

-- AlterTable
ALTER TABLE "Paiement" ADD COLUMN "detail" TEXT;
