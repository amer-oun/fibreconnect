# FibreConnect — Cahier des charges

> Rédigé au lancement du projet et tenu à jour avec l'application.
> La base a depuis migré de SQLite vers PostgreSQL pour le déploiement ;
> la contrainte d'absence d'`enum` décrite plus bas date de SQLite et les
> champs sont restés des `String` validés par zod.

---

## Contexte

Application web de gestion d'interventions pour une société de fibre optique en Tunisie.
Projet de fin d'études (stage BTP).

**La société est un sous-traitant.** Ses techniciens sont ses propres employés : ils
n'appartiennent à aucun opérateur. Elle dépanne les abonnés de deux réseaux partenaires,
Tunisie Telecom et Ooredoo. Elle ne travaille pas avec Orange.

**Langue de l'interface : français.** Tous les labels, boutons, messages d'erreur et
textes visibles par l'utilisateur sont en français. Le code (variables, fonctions,
commentaires) est en anglais.

## Stack imposée

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM + SQLite (fichier `prisma/dev.db`)
- NextAuth v4 (provider Credentials)
- bcryptjs pour le hachage des mots de passe
- recharts pour les graphiques du superviseur
- react-leaflet + OpenStreetMap pour la carte (pas de Google Maps, pas de clé API)

La stack est imposée par le sujet.

L'envoi de courriels n'ajoute **aucune bibliothèque** : ni Nodemailer, ni service
tiers. Le message et le dialogue SMTP sont écrits à la main dans `lib/courrier.ts`,
et le client SMTP est testé contre un vrai serveur lancé par le test lui-même.

## Les 3 rôles

| Rôle | Ce qu'il fait |
|---|---|
| `CLIENT` | S'inscrit seul, déclare une panne, suit l'avancement, règle sa facture, note le technicien à la fin |
| `TECHNICIEN` | S'inscrit seul (compte à valider) ou est créé par le superviseur ; voit les pannes de **sa zone**, les accepte, les traite, remplit un rapport, encaisse les espèces et les remet à la société |
| `SUPERVISEUR` | Valide les inscriptions techniciens, attribue matricules et zones, assigne à la main, désactive un compte, consulte les statistiques, **et tient les comptes** : encaissements, remises, impayés |

Le superviseur est l'administrateur. Il n'y a pas de quatrième rôle : ajouter un
`ADMIN` au-dessus d'un superviseur qui voit déjà tout créerait deux comptes pour
une seule personne, dans une société qui en compte une dizaine.

## Modèle de données

Dix tables : six pour l'activité, quatre pour l'argent.

**Utilisateur** — id, email (unique), motDePasse (haché), role (CLIENT | TECHNICIEN |
SUPERVISEUR), nom, prenom, telephone, statutCompte (défaut `ACTIF`), creeLe,
jetonReset (**unique, nullable**), jetonResetExpire (nullable).

Les deux derniers champs portent la réinitialisation de mot de passe. `jetonReset`
stocke l'**empreinte SHA-256** du jeton, jamais le jeton : la base volée ne donne
alors aucun lien utilisable. L'index unique tient malgré des milliers de lignes à
`NULL`, parce que SQLite considère deux `NULL` comme distincts.

**Operateur** — id, nom (unique), logoUrl. Valeurs de départ : Tunisie Telecom, Ooredoo.
Un opérateur n'a que des clients : aucun technicien ne lui est rattaché.

**Client** — id, utilisateurId (unique, FK), operateurId (FK), adresse, ville, **zone**,
numContrat (unique), latitude, longitude.

**Technicien** — id, utilisateurId (unique, FK), matricule (unique, **nullable**),
specialite, **zone**, disponible (défaut true), photoUrl. Pas de lien vers
Operateur, **ni salaire ni commission** : la paie est hors périmètre.

**Intervention** — id, clientId (FK), technicienId (FK nullable), superviseurId (FK
nullable vers Utilisateur, relation nommée "Superviseur"), typePanne, description,
statut (défaut NOUVELLE), priorite (défaut NORMALE), dateCreation, dateDebut, dateFin,
rapport, noteClient.

**Historique** — id, interventionId (FK), technicienId (FK nullable), action,
ancienStatut, nouveauStatut, dateAction, commentaire.

**Facture** — id, interventionId (unique, FK), numero (unique, `FC-2026-0007`),
montantHT, tauxTva, montantTva, timbreFiscal, montantTotal (TTC), statut (défaut
`A_PAYER`), dateEmission, datePaiement (nullable), motifRectification,
dateRectification, rectifieePar (tous nullables).

**LigneFacture** — id, factureId (FK), designation, montant (**hors taxes**).

**Paiement** — id, factureId (FK), montant, moyen, statut (défaut `EN_ATTENTE`),
reference (**unique**), technicienId (FK nullable — espèces seulement),
versementId (FK nullable), dateCreation, dateConfirmation.

**Versement** — id, technicienId (FK), montant, statut (défaut `EN_ATTENTE`),
commentaire, dateCreation, dateConfirmation, confirmePar.


### Les montants sont des entiers de millimes

1 DT = 1000 millimes. Aucun montant n'est un flottant, nulle part : `0.1 + 0.2`
ne vaut pas `0.3` en JavaScript, et sur une paie qui additionne deux cents
commissions le total cesserait de correspondre à la somme des lignes affichées.
`lib/monnaie.ts` est le seul endroit qui transforme un montant en texte.

### Contrainte importante

SQLite ne supporte pas les `enum` Prisma. Les champs `role`, `statutCompte`, `statut`,
`priorite`, `typePanne`, `zone`, `moyen` et les statuts de facture, de paiement et de
versement sont des `String`. Les valeurs autorisées sont définies dans
`lib/constants.ts` avec des `as const` + types TypeScript dérivés, et validées
par zod à chaque écriture. La contrainte est rappelée en commentaire dans le schéma.

### Valeurs autorisées

- statut : `NOUVELLE` → `ASSIGNEE` → `EN_COURS` → `TERMINEE`, plus `ANNULEE`
- priorite : `BASSE`, `NORMALE`, `HAUTE`, `URGENTE`
- typePanne : `COUPURE_TOTALE`, `DEBIT_FAIBLE`, `ONT_DEFECTUEUX`, `CABLE_ENDOMMAGE`,
  `NOUVELLE_INSTALLATION`, `CHANGEMENT_ROUTEUR`, `AUTRE`
- statutCompte : `ACTIF`, `EN_ATTENTE`, `DESACTIVE`
- zone : `Tunis`, `Ariana`, `Ben Arous`, `Manouba`, `Nabeul`, `Bizerte`, `Sousse`,
  `Monastir`, `Sfax`
- moyen (paiement) : `ESPECES`, `CARTE`, `VIREMENT`, `D17`
- statut de facture : `A_PAYER`, `PAYEE`, `ANNULEE`
- statut de paiement : `EN_ATTENTE`, `CONFIRME`, `ECHOUE`
- statut de versement : `EN_ATTENTE`, `CONFIRME`

La zone est une liste fermée de gouvernorats, jamais du texte libre : comparer des
villes laisserait un abonné de « La Marsa » invisible pour le technicien de « Tunis »,
et une faute de frappe masquerait une panne pour tout le monde, en silence.

Chaque constante a un libellé français affiché à l'écran (ex. `COUPURE_TOTALE` →
« Coupure totale »). Ces libellés sont centralisés dans `lib/constants.ts`.

## Règles métier

1. Une intervention est créée par un client avec le statut `NOUVELLE` et aucun technicien.
2. Un technicien ne voit dans son tableau de bord que les interventions `NOUVELLE` dont
   le client est dans la **même zone** que lui. C'est la règle centrale du projet.
   L'opérateur de l'abonné n'entre pas dans ce filtre.
3. Quand un technicien accepte : statut → `ASSIGNEE`, `technicienId` renseigné.
   L'acceptation est concurrente : deux techniciens de la même zone peuvent cliquer en
   même temps, un seul doit l'obtenir (`updateMany` conditionnel, pas lecture-puis-écriture).
4. « Démarrer » → `EN_COURS` + `dateDebut`. « Terminer » → `TERMINEE` + `dateFin` +
   rapport obligatoire (minimum 10 caractères).
5. Le superviseur peut assigner ou réassigner n'importe quelle intervention à n'importe
   quel technicien, **y compris hors de sa zone** — c'est le seul recours quand une zone
   n'a personne. L'écart est inscrit dans l'historique. Il peut aussi désactiver un
   compte (`statutCompte = DESACTIVE`).
6. Seul un compte `ACTIF` peut se connecter. `EN_ATTENTE` et `DESACTIVE` sont refusés,
   avec des messages distincts : une inscription en cours d'examen n'est pas un rejet.
7. Le client peut noter (1–5) une intervention `TERMINEE`, une seule fois.
8. Un technicien peut s'inscrire seul : son compte naît `EN_ATTENTE`, sans matricule.
   Le superviseur lui attribue matricule et zone, ce qui l'active — en un seul geste,
   dans une transaction. Sans ce filtre, n'importe qui verrait l'adresse des abonnés
   d'une zone entière.
9. La zone d'un technicien n'est pas modifiable par lui-même : elle décide des pannes
   qui lui sont proposées, la choisir reviendrait à choisir son travail.

### Les délais

Chaque priorité porte un délai de **prise en charge** (`DELAIS_PRISE_EN_CHARGE`
dans `lib/constants.ts`) : urgente 4 h, haute 24 h, normale 72 h, basse 7 jours.

Le chronomètre s'arrête à l'acceptation et ne repart pas : ce que dure ensuite la
réparation dépend d'un câble dans le sol, pas de l'aiguillage. Une panne encore
`NOUVELLE` au-delà de son délai est *hors délai*.

Le badge d'échéance s'affiche chez le technicien et le superviseur, **jamais chez
l'abonné** : un délai montré au client devient un engagement que la société n'a
pas pris (`afficherEcheance`, par défaut `false`).

Le tableau de bord technicien classe par temps restant, pas par étiquette de
priorité, pour que la liste et les badges ne se contredisent pas.

Les fonctions de délai sont **pures**, l'instant courant passé en paramètre : une
règle de délai qui lit l'horloge elle-même ne se teste qu'en attendant.

### L'argent

**L'abonné doit à la société, jamais au technicien.** Le technicien est un
salarié : il n'encaisse que des espèces, et seulement pour le compte de
l'entreprise.

10. La facture est émise **dans la transaction même** qui passe l'intervention en
    `TERMINEE` (paramètre `apres` de `changerStatut`). Une intervention terminée a
    toujours exactement une facture : « travaux faits, rien à payer » est un état
    que ni l'abonné ni la société ne sauraient interpréter.
11. La première ligne est le déplacement, au tarif publié du type de panne
    (`TARIFS` dans `lib/constants.ts`), annoncé à l'abonné dès la déclaration. Le
    technicien ajoute les pièces remplacées, une par ligne, à la clôture.
12. Une facture n'est soldée que par des paiements **confirmés**. Le virement reste
    `EN_ATTENTE` jusqu'à ce que le superviseur le voie sur le relevé bancaire ;
    l'abonné ne peut pas confirmer le sien (403).
13. Les espèces créent une dette du technicien envers la société, éteinte en deux
    temps : il **déclare** la remise, le superviseur **accuse réception**. Le montant
    est calculé côté serveur, jamais envoyé par le client — un champ libre
    permettrait de déclarer 200 DT en en gardant 400.
14. `Paiement.reference` est unique : une notification de passerelle rejouée ne
    compte pas l'encaissement deux fois.
15. **La paie des techniciens est hors périmètre.** L'application suit ce que
    l'abonné doit ; ce que la société verse à ses salariés relève de sa
    comptabilité. Le circuit des espèces reste, lui, entièrement ici : cet
    argent appartient à la société dès l'encaissement.
16. Le superviseur peut **corriger** les lignes d'une facture ou l'**annuler**,
    tant qu'aucun règlement n'est confirmé. Après un encaissement, même partiel,
    elle est figée : déplacer le total sous les pieds de qui a déjà payé donne un
    chiffre irrapprochable. Motif obligatoire (10 caractères minimum), stocké sur
    la facture et **affiché sur l'exemplaire de l'abonné**.
18. Export comptable en CSV depuis `/superviseur/finances` : Les montants sortent en nombres
    nus à virgule décimale (`montantPourTableur`), sans unité ni séparateur de
    milliers — une colonne « Montant » qui ne s'additionne pas ne sert à rien.

18. Les lignes de facture sont **hors taxes**. La TVA (`TVA_TAUX`, 19 %) et le
    droit de timbre (`TIMBRE_FISCAL`, 1,000 DT) s'ajoutent au pied ; `montantTotal`
    est le TTC, c'est-à-dire ce que l'abonné doit et ce que les règlements
    soldent. Le taux et le timbre sont **recopiés sur chaque facture** : ils
    changent par décision budgétaire, et une facture ancienne doit se relire
    avec les taux de son époque. Un seul calcul, `totauxFacture` dans
    `lib/constants.ts` — jamais dans `lib/facturation.ts`, qui importe Prisma et
    ne peut donc pas servir un composant client.
    **La commission du technicien porte sur le hors-taxes** : la TVA transite
    par la société sans lui appartenir.
20. L'abonné dispose d'un **document** à imprimer ou enregistrer en PDF
    (`/client/facture/[id]`), que le superviseur relit à l'identique. Deux rendus
    différents de la même facture finiraient par diverger. **Ce document n'est
    pas une pièce fiscale et le dit en pied de page**. Le matricule fiscal
    imprimé est **tout à zéro** (`0000000/A/M/000`) : aucun numéro d'apparence
    plausible n'est inventé, c'est la même règle que pour la passerelle bancaire. Voir
    `lib/societe.ts` et son drapeau `mentionsReelles`.

**La passerelle de paiement est simulée et le dit à l'écran.** Stripe n'accepte pas
les comptes marchands tunisiens ; Paymee et Flouci demandent un contrat signé. Le
découpage en deux temps — `ouvrirPaiement` puis `confirmerPaiement` — est celui
qu'attendent ces prestataires : la confirmation viendrait d'un webhook au lieu d'un
bouton. Aucune page n'imite l'interface d'une vraie banque.

### Historique

**Toute** transition de statut écrit une ligne dans `Historique`. Tout passe par une
fonction unique `changerStatut()` dans `lib/interventions.ts` qui, dans une transaction
Prisma, met à jour l'intervention et crée la ligne d'historique. Aucune route ne
modifie `statut` directement.

### Courriels

L'abonné est **prévenu**, au lieu d'avoir à revenir voir. Huit messages :
acceptation, réaffectation, démarrage, clôture avec le détail de la facture,
règlement confirmé, annulation par la société, validation d'un compte technicien,
et lien de réinitialisation.

**Aucune dépendance ajoutée** : `lib/courrier.ts` compose le message (RFC 5322) et
parle SMTP à la main, `lib/courriels.ts` écrit les huit textes. Trois transports :
`fichier` — dépose un `.eml` dans `courrier/`, c'est le mode de la machine de
démonstration —, `smtp`, et `silencieux` pour les tests.

Le corps part **en base64**. SMTP interdit une ligne de corps commençant par un
point seul, qui terminerait la transmission avant l'heure, et limite les lignes à
1000 octets : le base64 ne produit ni l'un ni l'autre, donc les deux pièges
disparaissent au lieu d'être surveillés. Les valeurs d'en-tête sont débarrassées de
tout `\r\n` — un nom saisi au formulaire d'inscription pourrait sinon injecter un
destinataire caché.

**Un courriel ne fait jamais échouer une intervention.** L'envoi passe par `after()`
de `next/server`, donc après que la réponse HTTP est partie, et `envoyer()` ne lève
jamais : un serveur de courrier en panne ne doit pas empêcher un technicien de
clôturer son chantier.

## Sécurité

- Mots de passe hachés avec bcrypt (10 rounds). Jamais de mot de passe en clair, jamais
  renvoyé par une API.
- `proxy.ts` protège `/client/*`, `/technicien/*`, `/superviseur/*` selon le rôle.
  (Next.js 16 a renommé `middleware.ts` en `proxy.ts` ; c'est le même fichier.)
- **Le rôle et la propriété sont revérifiés dans chaque route API**, pas seulement dans
  le middleware. Un technicien ne peut pas modifier l'intervention d'un collègue via un
  appel direct à l'API.
- Validation zod sur tous les payloads entrants.
- **Photos envoyées** : le format est décidé par la **signature binaire** du
  fichier, jamais par le type annoncé par le navigateur ni par l'extension du
  nom — les deux viennent du client. Le nom écrit sur le disque est tiré au
  sort, et un nom reçu dans une URL doit correspondre exactement à cette forme,
  sans quoi il servirait à lire un fichier ailleurs sur le serveur.
- **Réinitialisation de mot de passe** (`lib/reinitialisation.ts`) : jeton de 32 octets
  aléatoires, stocké haché, valable une heure, **utilisable une seule fois** (consommé
  par un `updateMany` conditionnel, comme l'acceptation d'une intervention). Le
  formulaire répond **la même chose** que l'adresse existe ou non — sinon il servirait
  à savoir qui est abonné. Un compte `EN_ATTENTE` ou `DESACTIVE` ne reçoit rien :
  promettre un accès qui sera refusé au bout du parcours ne rend service à personne.

## Pages

```
/                          page de garde publique
/login                     formulaire unique, redirige selon le rôle
/register                  inscription client
/register/technicien       candidature technicien (compte EN_ATTENTE)
/mot-de-passe-oublie       demande d'un lien de réinitialisation
/mot-de-passe-oublie/[jeton]   choix du nouveau mot de passe

/client/dashboard          mes demandes
/client/nouvelle-panne     formulaire de déclaration
/client/suivi/[id]         timeline + facture et paiement + notation
/client/facture/[id]       la facture en document A4, à imprimer ou en PDF
/client/profil             coordonnées, zone, mot de passe

/technicien/dashboard      interventions disponibles (filtre par zone)
/technicien/mes-interventions   accepter / démarrer / terminer
/technicien/historique     interventions passées + filtres
/technicien/caisse         encaissements, espèces détenues, remises
/technicien/profil         spécialité, disponibilité, photo (zone en lecture seule)

/superviseur/dashboard     statistiques + couverture des zones
/superviseur/techniciens   liste, validation des inscriptions, activation
/superviseur/techniciens/nouveau   créer un technicien directement, sans candidature
/superviseur/techniciens/[id]   profil, validation, changement de zone, historique
/superviseur/interventions assignation manuelle
/superviseur/clients       liste + carte des lieux
/superviseur/finances      encaissements, remises et virements à confirmer, impayés
/superviseur/factures/[id] fiche facture : corriger ou annuler
/superviseur/reseaux       opérateurs partenaires et logos
/superviseur/profil        coordonnées et mot de passe du superviseur
```

La page de garde affiche trois entrées visibles — « Espace client », « Espace
technicien », « Espace superviseur » — qui pointent toutes vers `/login`. C'est une
exigence de l'encadrante : trois portes à l'écran, un seul code d'authentification
derrière.

## Direction visuelle

Le sujet est la fibre : des brins de lumière qui traversent une distance. Le projet
écarte le template SaaS générique (fond crème, serif contrasté, accent terracotta) et
les cartes arrondies avec ombre portée partout.

Palette : bleu nuit profond `#0B1D3A`, cyan signal `#22D3EE`, blanc cassé `#F5F7FA`,
gris ardoise `#64748B`, ambre alerte `#F59E0B` pour les statuts urgents. Le cyan ne sert
qu'aux éléments actifs et aux traits de liaison — jamais en aplat de fond.

Élément signature : une fine ligne cyan animée qui relie les étapes de la timeline d'une
intervention, comme un signal qui progresse dans le câble. Une seule animation dans tout
le projet, respectant `prefers-reduced-motion`.

Chaque statut a une couleur constante réutilisée partout (badges, tableaux, graphiques) :
NOUVELLE = ardoise, ASSIGNEE = bleu, EN_COURS = ambre, TERMINEE = vert, ANNULEE = rouge.

Boutons en voix active : « Accepter l'intervention », « Terminer l'intervention »,
« Enregistrer le rapport ». Jamais « Soumettre » ou « Valider » seul. Les états vides
disent quoi faire : « Aucune intervention disponible dans votre zone pour le moment. »

Responsive obligatoire : les techniciens consultent l'app sur téléphone en déplacement,
le tableau de bord technicien doit être utilisable à 375px de large.

## Jeu de données de test

Fichier `prisma/seed.ts`, exécutable avec `npx prisma db seed`. Mot de passe unique pour
tous les comptes de démo : `Passer123` (haché en base). Le seed affiche la liste des
identifiants dans la console à la fin de son exécution.

- 2 opérateurs partenaires
- 1 superviseur : `superviseur@fibreconnect.tn`
- 5 techniciens FibreConnect, matricules `FC-001` à `FC-005`, zones : Tunis (deux),
  Ariana, Ben Arous, Sfax
- 6 clients répartis sur les 2 opérateurs, avec latitude/longitude réelles en Tunisie.
  **Un abonné est en zone Sousse, que personne ne couvre** : c'est volontaire, cela
  démontre l'alerte de couverture et l'affectation manuelle hors zone. Sa panne est
  déclarée depuis 30 h en priorité haute (délai : 24 h), donc **hors délai** — une
  zone sans technicien ne produit pas une gêne abstraite, elle fait rater un
  engagement, et la démonstration doit rendre ce lien visible.
- 10 interventions couvrant tous les statuts, avec leurs lignes d'historique cohérentes,
  plus un historique sur 6 mois pour donner du relief aux graphiques
- une facture par intervention terminée, numérotées **dans l'ordre des dates de
  clôture** — un registre dont les numéros remontent le temps est la première chose
  qu'un comptable remarque
- des règlements répartis sur les quatre moyens, dont **quatre factures impayées**,
  **un virement annoncé et non confirmé**, **quatre techniciens détenant encore des
  espèces** et **une remise en attente d'accusé de réception** : sans eux, l'écran de
  paiement, celui d'encaissement et la file du superviseur se démontreraient vides

## Ordre de construction

Le projet a été bâti une étape à la fois, chacune vérifiée avant de passer à la
suivante.

1. Init du projet, install des dépendances, `prisma init`
2. `schema.prisma` + `npx prisma migrate dev --name init`
3. `lib/constants.ts` et `lib/prisma.ts` (singleton client)
4. `prisma/seed.ts` + exécution + vérification dans Prisma Studio
5. NextAuth + `proxy.ts` + page `/login` + redirection par rôle
6. Page de garde
7. Espace client complet
8. `lib/interventions.ts` (`changerStatut`) puis espace technicien complet
9. Espace superviseur : tableaux, assignation, statistiques
10. Carte Leaflet des clients
11. Passe finale : responsive, focus clavier visible, messages d'erreur, README
12. `lib/monnaie.ts` et `lib/facturation.ts`, puis le circuit de l'argent dans les
    trois espaces : facture et paiement chez le client, caisse chez le technicien,
    finances chez le superviseur
13. `lib/courrier.ts` et `lib/courriels.ts` : les huit messages, branchés en `after()`
    sur les transitions qui concernent l'abonné
14. `lib/reinitialisation.ts` : mot de passe oublié, jeton haché à usage unique

Les étapes 1 à 12 sont celles du cahier des charges remis au départ. Les deux
dernières ont été ajoutées en cours de route : une application où l'abonné doit
revenir voir de lui-même si son technicien est passé, et où un mot de passe perdu
ferme définitivement le compte, n'est pas terminée.

## Conventions

- Server Components par défaut ; `"use client"` seulement pour les formulaires et la carte.
- Accès base uniquement côté serveur, via le singleton `lib/prisma.ts`.
- Route Handlers dans `app/api/`, réponses JSON `{ data }` ou `{ error: "message en français" }`.
- Dates affichées au format `dd/MM/yyyy HH:mm`.
- Un commit git par étape terminée, message en français.
- Toute liste qui grandit sans limite est paginée (`lib/pagination.ts`). La carte
  des abonnés fait exception : elle charge tous les points, la liste sous elle
  est paginée.
- `npm run sauvegarde` prend un instantané SQLite par `VACUUM INTO`, jamais par
  copie de fichier : une copie prise pendant une transaction est déchirée.
- N'installe aucune dépendance qui n'est pas listée plus haut sans demander.

## README

À l'étape 11, génère un `README.md` avec : présentation, stack, schéma de la base en
mermaid `erDiagram`, instructions d'installation, identifiants de démo, et la liste des
règles métier. Ce fichier servira de base au rapport de stage.

**C'est le `README.md` qui fait foi.** Le présent document dit ce qu'il fallait
construire ; le README dit ce qui existe, audité ligne à ligne contre le code, et
il porte en plus les scénarios de démonstration et une section « Limites connues ».
En cas de désaccord entre les deux, c'est le README qu'il faut croire — et ce
fichier-ci qu'il faut corriger.
