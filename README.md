# FibreConnect

**FibreConnect est un sous-traitant de maintenance fibre optique en Tunisie.**
Ses techniciens sont ses propres employés : ils n'appartiennent à aucun
opérateur. La société dépanne les abonnés de deux réseaux partenaires —
Tunisie Telecom et Ooredoo — et chaque technicien couvre un **secteur
géographique**.

Trois profils s'y croisent : l'abonné qui déclare une panne, le technicien qui
la traite sur le terrain, et le superviseur qui arbitre.

> **Ce que signifie `Technicien.zone`** : le gouvernorat où le technicien se
> déplace. C'est de là que découle la règle centrale du projet — un technicien
> ne voit que les pannes de sa zone, quel que soit l'opérateur de l'abonné.
>
> L'opérateur reste dans le modèle, mais comme une information de contrat de
> l'abonné : il n'influe plus sur qui intervient.

Projet de fin d'études (stage BTP).

---

## Sommaire

- [Ce que fait l'application](#ce-que-fait-lapplication)
- [Stack technique](#stack-technique)
- [Schéma de la base](#schéma-de-la-base)
- [Délais de prise en charge](#délais-de-prise-en-charge)
- [Facturation et paiement](#facturation-et-paiement)
- [Courriels](#courriels)
- [Installation](#installation)
- [Identifiants de démonstration](#identifiants-de-démonstration)
- [Règles métier](#règles-métier)
- [Architecture](#architecture)
- [Sécurité](#sécurité)
- [Direction visuelle](#direction-visuelle)
- [Choix techniques notables](#choix-techniques-notables)
- [Limites connues](#limites-connues)

---

## Ce que fait l'application

| Rôle | Ce qu'il peut faire |
|---|---|
| **Client** | S'inscrire seul, déclarer une panne avec photo **au tarif annoncé**, suivre son avancement étape par étape, l'annuler, **régler sa facture**, noter le technicien une fois l'intervention terminée. Il est **prévenu par courriel** à chaque étape sans avoir à revenir voir |
| **Technicien** | S'inscrire seul (compte à valider), consulter les pannes **de sa zone**, les accepter, les démarrer, rédiger le rapport de clôture avec photo et les pièces facturées, **encaisser les espèces et les remettre à la société**, gérer son profil |
| **Superviseur** | Piloter l'activité : statistiques, couverture des zones, validation des inscriptions techniciens, attribution des matricules et des zones, affectation manuelle, carte des abonnés, **finances de la société** |

### Pages

```
/                               page de garde publique (trois portes)
/login                          formulaire unique, redirection selon le rôle
/register                       inscription, réservée aux abonnés
/register/technicien            candidature technicien (compte en attente)
/mot-de-passe-oublie            demande d'un lien de réinitialisation
/mot-de-passe-oublie/[jeton]    choix d'un nouveau mot de passe

/client/dashboard               mes demandes + recherche et filtres
/client/nouvelle-panne          déclaration, prix annoncé, photo facultative
/client/suivi/[id]              timeline, rapport, facture et paiement, notation
/client/facture/[id]            la facture en document A4, à imprimer ou en PDF
/client/profil                  coordonnées, zone, mot de passe

/technicien/dashboard           pannes de la zone couverte
/technicien/mes-interventions   accepter / démarrer / terminer + pièces facturées
/technicien/caisse              factures à encaisser, espèces détenues, remises
/technicien/historique          interventions passées, rapports, notes
/technicien/profil              photo, spécialité, disponibilité, mot de passe

/superviseur/dashboard          ce qui appelle une décision : retards, zones, impayés
/superviseur/interventions      affectation, réaffectation, annulation
/superviseur/finances           encaissements, remises et virements à confirmer, impayés
/superviseur/factures/[id]      fiche facture : corriger ou annuler
/superviseur/techniciens        équipe par zone, validation, activation
/superviseur/techniciens/nouveau  création d'un compte technicien
/superviseur/techniciens/[id]   fiche, validation, changement de zone, journal
/superviseur/clients            liste et carte OpenStreetMap
/superviseur/reseaux            opérateurs partenaires et logos
/superviseur/profil             mot de passe
```

---

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styles | Tailwind CSS v4 |
| Base de données | SQLite via Prisma ORM 6 |
| Authentification | NextAuth v4, provider Credentials |
| Mots de passe | bcryptjs, 10 rounds |
| Validation | zod |
| Graphiques | recharts |
| Cartographie | react-leaflet + OpenStreetMap (aucune clé API) |
| Tests | Vitest, sur une base SQLite jetable |

---

## Schéma de la base

Dix tables : six pour l'activité, quatre pour l'argent. SQLite ne supportant pas
les `enum` Prisma, les champs `role`, `statutCompte`, `statut`, `priorite`,
`typePanne`, `zone`, `moyen` et les statuts de facture, de paiement et de
versement sont des `String` dont les valeurs autorisées sont centralisées dans
`lib/constants.ts` et validées par zod à chaque écriture.

**Tous les montants sont des entiers en millimes** (1 DT = 1000 millimes),
jamais des décimaux — voir [Facturation et paiement](#facturation-et-paiement).

Noter qu'aucune relation ne relie `Operateur` à `Technicien` : c'est la
traduction dans le schéma du fait que les techniciens sont des employés de
FibreConnect. Le lien qui compte est `Client.zone` ↔ `Technicien.zone`.

```mermaid
erDiagram
    Utilisateur ||--o| Client : "profil"
    Utilisateur ||--o| Technicien : "profil"
    Utilisateur ||--o{ Intervention : "supervise"
    Operateur   ||--o{ Client : "abonnés"
    Client      ||--o{ Intervention : "déclare"
    Technicien  ||--o{ Intervention : "traite"
    Technicien  ||--o{ Historique : "agit"
    Intervention ||--o{ Historique : "journalise"
    Intervention ||--o| Facture : "émet à la clôture"
    Facture     ||--o{ LigneFacture : "détaille"
    Facture     ||--o{ Paiement : "réglée par"
    Technicien  ||--o{ Paiement : "encaisse en espèces"
    Technicien  ||--o{ Versement : "remet"
    Versement   ||--o{ Paiement : "regroupe"

    Utilisateur {
        string   id PK
        string   email UK
        string   motDePasse "hache bcrypt"
        string   role "CLIENT|TECHNICIEN|SUPERVISEUR"
        string   nom
        string   prenom
        string   telephone
        string   statutCompte "ACTIF|EN_ATTENTE|DESACTIVE"
        datetime creeLe
        string   jetonReset UK "empreinte SHA-256, nullable"
        datetime jetonResetExpire "nullable"
    }

    Operateur {
        string id PK
        string nom UK
        string logoUrl "nullable"
    }

    Client {
        string id PK
        string utilisateurId FK "unique"
        string operateurId FK
        string adresse
        string ville
        string zone "gouvernorat - regle centrale"
        string numContrat UK
        float  latitude "nullable"
        float  longitude "nullable"
    }

    Technicien {
        string  id PK
        string  utilisateurId FK "unique"
        string  matricule UK "nullable avant validation"
        string  specialite
        string  zone "gouvernorat - regle centrale"
        boolean disponible "defaut true"
        string  photoUrl "nullable"
    }

    Intervention {
        string   id PK
        string   clientId FK
        string   technicienId FK "nullable"
        string   superviseurId FK "nullable"
        string   typePanne
        string   description
        string   statut "defaut NOUVELLE"
        string   priorite "defaut NORMALE"
        datetime dateCreation
        datetime dateDebut "nullable"
        datetime dateFin "nullable"
        string   rapport "nullable"
        int      noteClient "nullable 1-5"
        string   photoPanne "nullable"
        string   photoRapport "nullable"
    }

    Historique {
        string   id PK
        string   interventionId FK
        string   technicienId FK "nullable"
        string   action
        string   ancienStatut "nullable"
        string   nouveauStatut
        datetime dateAction
        string   commentaire "nullable"
    }

    Facture {
        string   id PK
        string   interventionId FK "unique"
        string   numero UK "FC-2026-0007"
        int      montantHT "millimes - somme des lignes"
        float    tauxTva "fige a l emission"
        int      montantTva "millimes"
        int      timbreFiscal "millimes - fige"
        int      montantTotal "millimes TTC - ce que l abonne doit"
        string   statut "A_PAYER|PAYEE|ANNULEE"
        datetime dateEmission
        datetime datePaiement "nullable"
        string   motifRectification "nullable - lu par l abonne"
        datetime dateRectification "nullable"
        string   rectifieePar "nullable - id superviseur"
    }

    LigneFacture {
        string id PK
        string factureId FK
        string designation
        int    montant "millimes HORS TAXES"
    }

    Paiement {
        string   id PK
        string   factureId FK
        int      montant "millimes"
        string   moyen "ESPECES|CARTE|VIREMENT|D17"
        string   statut "EN_ATTENTE|CONFIRME|ECHOUE"
        string   reference UK "anti-rejeu"
        string   detail "nullable - Visa ****4242"
        string   technicienId FK "nullable - especes seulement"
        string   versementId FK "nullable"
        datetime dateCreation
        datetime dateConfirmation "nullable"
    }

    Versement {
        string   id PK
        string   technicienId FK
        int      montant "millimes"
        string   statut "EN_ATTENTE|CONFIRME"
        string   commentaire "nullable"
        datetime dateCreation
        datetime dateConfirmation "nullable"
        string   confirmePar "nullable"
    }

```

### Valeurs autorisées

| Champ | Valeurs |
|---|---|
| `role` | `CLIENT`, `TECHNICIEN`, `SUPERVISEUR` |
| `statutCompte` | `ACTIF`, `EN_ATTENTE`, `DESACTIVE` |
| `statut` | `NOUVELLE` → `ASSIGNEE` → `EN_COURS` → `TERMINEE`, plus `ANNULEE` |
| `priorite` | `BASSE`, `NORMALE`, `HAUTE`, `URGENTE` |
| `typePanne` | `COUPURE_TOTALE`, `DEBIT_FAIBLE`, `ONT_DEFECTUEUX`, `CABLE_ENDOMMAGE`, `NOUVELLE_INSTALLATION`, `CHANGEMENT_ROUTEUR`, `AUTRE` |
| `zone` | `Tunis`, `Ariana`, `Ben Arous`, `Manouba`, `Nabeul`, `Bizerte`, `Sousse`, `Monastir`, `Sfax` |
| `moyen` | `ESPECES`, `CARTE`, `VIREMENT`, `D17` |
| `Facture.statut` | `A_PAYER`, `PAYEE`, `ANNULEE` |
| `Paiement.statut` | `EN_ATTENTE`, `CONFIRME`, `ECHOUE` |
| `Versement.statut` | `EN_ATTENTE`, `CONFIRME` |

**Pourquoi une liste fermée de gouvernorats et non la ville.** Comparer des
villes laisserait un abonné de « La Marsa » invisible pour le technicien qui
couvre « Tunis », et une simple faute de frappe masquerait une panne pour tout
le monde — sans message d'erreur, ce qui est la pire façon pour une règle
d'aiguillage d'échouer.

---

## Délais de prise en charge

Une priorité qui n'engage à rien n'est qu'une couleur. Chaque niveau porte donc
un délai, en heures, dans lequel la société s'engage à ce qu'un technicien
**accepte** la panne.

| Priorité | Délai | Ce que ça veut dire |
|---|---|---|
| Urgente | 4 h | Un abonné totalement coupé |
| Haute | 24 h | Une gêne sérieuse, mais la ligne fonctionne |
| Normale | 72 h | Le cas courant |
| Basse | 7 j | Confort, installation planifiée |

**Le chronomètre s'arrête à l'acceptation, et ne repart pas.** Ce que dure
ensuite la réparation dépend d'un câble dans le sol, pas de l'aiguillage ; le
compter ici transformerait un chantier difficile en promesse rompue. Le délai
mesure la seule chose que la société maîtrise vraiment : trouver quelqu'un.

**Quatre heures pour une urgence, pas une.** Un objectif raté à chaque fois
apprend à tout le monde à ignorer la couleur, ce qui est pire que de n'avoir
aucun objectif. Un délai n'est utile que tant qu'on y croit.

### Ce que ça change à l'écran

Chaque panne encore sans technicien porte un badge : « Il reste 3 h 12 », puis
« En retard de 6 h ». Il apparaît **chez le technicien et chez le superviseur,
jamais chez l'abonné** — un délai montré au client devient un engagement que la
société n'a pas pris, et « En retard de 6 h » sur l'écran de quelqu'un qui ne
peut rien y faire est un reproche sans remède. Le jour où la société veut en
faire une promesse publique, c'est un booléen à passer à `true`
(`afficherEcheance` dans [components/interventions/ligne-intervention.tsx](components/interventions/ligne-intervention.tsx)).

Le tableau de bord du technicien **classe par temps restant**, pas par étiquette
de priorité. À âge égal une urgente passe toujours devant une haute — la
priorité est déjà dans le délai qu'elle accorde. Ce que ce tri ajoute, c'est le
vieillissement : une normale de trois jours passe devant une basse du matin.
Surtout, la liste dit alors la même chose que le badge posé sur chaque ligne ;
un tri par priorité qui reléguerait en bas une panne marquée « En retard »
donnerait deux consignes contradictoires sur le même écran.

Le superviseur voit le nombre de pannes hors délai sur son tableau de bord,
reçoit une notification par panne concernée, et dispose d'un filtre **Délai →
Hors délai** sur la liste des interventions. Le compteur et la liste derrière le
lien viennent de la même clause SQL (`conditionHorsDelai` dans
[lib/filtres.ts](lib/filtres.ts)), donc ils ne peuvent pas diverger.

### Export comptable

Le superviseur télécharge deux documents depuis [/superviseur/finances](app/superviseur/finances/page.tsx) :

| Fichier | Contenu |
|---|---|
| `factures-AAAA-MM-JJ.csv` | Le registre complet, de la plus ancienne à la plus récente |
| `factures-impayees-AAAA-MM-JJ.csv` | Les seules non soldées |

Les montants sortent en **nombres nus à virgule décimale** (`105,500`), sans
unité ni séparateur de milliers : une colonne « Montant » qui ne s'additionne
pas dans Excel ne sert à rien. Cette virgule suppose un Excel français, ce qui
est déjà l'hypothèse de [lib/csv.ts](lib/csv.ts) — les deux conventions vont de
pair, on ne peut pas en changer une seule.


---

## Facturation et paiement

### Qui doit quoi à qui

**L'abonné doit à la société, jamais au technicien.** Le technicien est un
salarié : il ne vend rien, il exécute. Cette phrase décide de toute
l'architecture financière de l'application.

```
                 ┌──────────────────────────────────────────┐
                 │  carte · virement · D17                  │
   Abonné ───────┼─────────────────────────────▶  Société   │
                 │                                     ▲    │
                 │  espèces                            │    │
                 └──────▶  Technicien  ──── remise ────┘    │
                                                            │
                 └──────────────────────────────────────────┘
```

Les espèces sont le seul cas où l'argent transite par quelqu'un. Le technicien
qui encaisse 30 DT sur le trottoir ne les a pas gagnés : il les **détient pour
le compte de la société**, et cette dette ne s'éteint qu'au moment où le
superviseur accuse réception de la remise.

Aucune flèche ne part de la société vers le technicien : ce que l'entreprise
verse à ses salariés est hors périmètre — voir [plus bas](#ce-que-lapplication-ne-fait-pas--la-paie).

### Les quatre moyens de paiement

| Moyen | Qui reçoit | Confirmation |
|---|---|---|
| Espèces au technicien | le technicien, pour le compte de la société | immédiate — l'argent a changé de main |
| Carte bancaire | la société | immédiate (passerelle) |
| D17 / e-Dinar | la société | immédiate (passerelle) |
| Virement bancaire | la société | **par le superviseur**, relevé bancaire en main |

Un virement annoncé n'est pas un virement reçu. L'abonné ne peut pas confirmer
le sien : la route API le refuse explicitement (403). Solder une facture sur
simple déclaration serait la faille la plus facile à exploiter de toute
l'application.

### La passerelle de paiement est simulée, et le dit

Aucun argent ne circule dans cette version. **Stripe n'accepte pas les comptes
marchands tunisiens**, et les prestataires locaux — Paymee, Flouci — demandent
un contrat signé qu'un projet d'études n'a pas les moyens d'obtenir. L'écran de
paiement affiche donc « Passerelle de paiement — simulation » : une fausse page
bancaire qui se ferait passer pour vraie serait la seule chose malhonnête de ce
projet.

Ce qui est conservé, c'est la **forme** d'une vraie passerelle : une intention
de paiement (`ouvrirPaiement`), puis une confirmation séparée
(`confirmerPaiement`). Le jour où un prestataire est raccordé, la confirmation
arrive d'un webhook au lieu d'un bouton, et rien d'autre ne change. Si le
paiement avait été enregistré en un seul appel, tout le flux serait à réécrire.

Le champ `Paiement.reference` est `@unique` : une notification rejouée par la
passerelle — ce qui arrive en production — ne compte pas l'encaissement deux
fois. Un test le vérifie en confirmant trois fois de suite.

### La facture naît avec la clôture

La facture est émise **dans la transaction même** qui passe l'intervention en
`TERMINEE` (paramètre `apres` de `changerStatut`). Une intervention terminée a
donc toujours exactement une facture. « Travaux faits, rien à payer » est un
état qu'aucune des deux parties ne saurait interpréter : il ne doit pas pouvoir
exister, même une seconde. Un test provoque un échec de facturation et vérifie
que l'intervention reste `EN_COURS`.

La première ligne est le déplacement, au tarif publié du type de panne — celui
qui a été annoncé à l'abonné quand il a déclaré sa panne, pas découvert à la
fin. Le technicien ajoute ensuite les pièces remplacées, une par ligne, au
moment de rédiger son rapport.

| Type de panne | Tarif HT | Payé par l'abonné |
|---|---|---|
| Débit faible | 20,000 DT | 24,800 DT |
| Coupure totale | 25,000 DT | 30,750 DT |
| Autre | 25,000 DT | 30,750 DT |
| Changement de routeur | 30,000 DT | 36,700 DT |
| ONT défectueux | 35,000 DT | 42,650 DT |
| Câble endommagé | 45,000 DT | 54,550 DT |
| Nouvelle installation | 60,000 DT | 72,400 DT |

Un abonnement fibre coûte 30 à 60 DT par mois en Tunisie : un dépannage
facturé plus cher que l'abonnement qu'il répare ne se vend pas. **Le prix est
affiché sur le formulaire de déclaration**, en face de chaque type de panne et
détaillé sous le champ, avant que l'abonné ne valide. Un montant découvert à la
fin de l'intervention ne laisse qu'un recours : la contestation.

### TVA et droit de timbre

**Toutes les lignes de facture sont hors taxes.** Le pied de facture ajoute la
TVA (19 %, taux des prestations de service) puis le droit de timbre (1,000 DT,
montant fixe par facture). `Facture.montantTotal` est le **TTC** : c'est ce que
l'abonné doit, et donc ce que les règlements soldent.

| | |
|---|---|
| Déplacement — Coupure totale | 25,000 DT |
| **Total hors taxes** | 25,000 DT |
| TVA 19 % | 4,750 DT |
| Droit de timbre | 1,000 DT |
| **Total toutes taxes comprises** | **30,750 DT** |

Le taux et le timbre sont **recopiés sur chaque facture à son émission**, jamais
relus dans `lib/constants.ts` au moment de l'affichage. Un taux de TVA change
par décision budgétaire ; une facture de l'an dernier dont le total se
recalculerait au taux du jour ne correspondrait plus à ce que l'abonné a payé.
Une facture doit se relire avec les taux de son époque.

**La TVA et le timbre ne sont pas de l'argent de la société.** Ils sont
encaissés pour le compte de l'État et transitent sans jamais lui appartenir.
C'est pourquoi la page Finances affiche le facturé en TTC — ce que les abonnés
doivent — en précisant dessous la part de TVA à reverser, plutôt qu'un seul
chiffre qui mélangerait les deux.

Une seule fonction calcule ces quatre montants — `totauxFacture` dans
[lib/constants.ts](lib/constants.ts) — utilisée par l'émission, la correction,
le seed et l'aperçu que voit le technicien avant de clôturer. Deux
implémentations arrondissant différemment produiraient un total que personne ne
saurait reproduire, et le seul endroit où cela se verrait est l'exemplaire de
l'abonné. Elle vit dans `constants.ts` et non dans `facturation.ts` parce que le
formulaire de clôture est un composant client : importer un module qui parle à
Prisma pour additionner trois nombres embarquerait le client de base de données
dans le navigateur.

### Le document

L'abonné dispose d'un exemplaire à garder, sur `/client/facture/[id]` : en-tête
de la société, bloc « Facturé à », détail ligne par ligne, règlements, solde. La
boîte d'impression du navigateur propose « Enregistrer au format PDF » sur toutes
les plateformes, ce qui évite d'embarquer une bibliothèque PDF pour un document
que le navigateur sait déjà produire.

C'est une page à part et non un panneau de plus sur le suivi : le suivi raconte
l'avancement d'une panne, la facture est une pièce qu'on conserve. Les mélanger
donnerait un document couvert de boutons dès qu'on l'imprime. Le document est
aussi **délibérément différent du reste de l'interface** — ni panneau, ni badge,
ni filet : le chrome qui aide à naviguer dans une liste ne fait que gêner qui
vérifie ce qu'il doit.

Le superviseur relit **exactement le même document** sur
`/superviseur/factures/[id]`. Deux rendus différents de la même facture
finiraient par diverger, et celui qui tiendrait le mauvais aurait raison de s'en
méfier.

> **Ce document n'est pas une pièce fiscale, et il le dit.** Le matricule
> fiscal imprimé est `0000000/A/M/000` : un numéro **tout à zéro**, qui ne peut
> pas entrer en collision avec celui d'une société réelle et se lit comme un
> exemple au premier coup d'œil, tout en montrant où la mention se place sur la
> page. En inventer un plausible produirait un papier capable de passer pour un
> document officiel — exactement la ligne que ce projet trace déjà en refusant
> de simuler une page bancaire crédible.
>
> Le jour où les vraies informations sont connues : remplacer `matriculeFiscal`
> et passer `mentionsReelles` à `true` dans [lib/societe.ts](lib/societe.ts). La
> note de bas de page disparaît d'elle-même.

### Corriger une facture erronée

Un technicien qui tape 2100 DT au lieu de 210 DT crée une dette que l'abonné ne
peut pas contester et que personne ne peut réparer. Ce n'est pas un état
acceptable pour une application qui imprime des montants. Le superviseur
dispose donc de deux gestes, depuis `/superviseur/factures/[id]` :

| Geste | Effet | Quand |
|---|---|---|
| **Corriger** | Les lignes sont remplacées, le total recalculé | Erreur de montant ou de désignation |
| **Annuler** | L'abonné ne doit plus rien, la facture sort du chiffre d'affaires | Garantie, geste commercial — « rien à facturer » |

Les deux **refusent dès qu'un règlement a été confirmé, même partiellement** :
déplacer le total sous les pieds de quelqu'un qui a déjà payé une moitié produit
un chiffre qu'aucune des deux parties ne peut rapprocher. Ce cas-là demande un
avoir, que cette version ne gère pas.

Les deux **exigent un motif d'au moins dix caractères**, stocké sur la facture
et **affiché sur l'exemplaire de l'abonné**, à côté du nouveau montant. Un
montant qui change sans que personne sache pourquoi est indéfendable devant
l'abonné comme devant le technicien qui a établi la facture. « Erreur » ne dit
rien à qui relira la facture dans six mois.

L'annulation est **définitive** : l'intervention n'en recevra pas de nouvelle,
la relation étant un-à-un.

### Les montants sont des entiers de millimes

1 dinar = 1000 millimes. **Aucun montant n'est un décimal** dans cette
application : ni en base, ni en mémoire, ni dans les calculs. En JavaScript,
aujourd'hui encore :

```js
0.1 + 0.2 === 0.30000000000000004
```

Sur une facture, personne ne le voit. Sur un registre qui additionne deux cents
factures, le total cesse de correspondre à la somme des lignes affichées
au-dessus — et cela ne s'explique pas à un comptable. Les entiers
s'additionnent exactement, donc un total est toujours la somme de ce qui est
imprimé. SQLite n'a de toute façon pas de type décimal.

`lib/monnaie.ts` contient les seules fonctions autorisées à transformer un
montant en texte : `formaterMontant` (trois décimales, toujours) et
`formaterMontantCourt` (pour les graphiques).

### Ce que l'application ne fait pas : la paie

**La rémunération des techniciens n'est pas gérée ici, et c'est délibéré.**

Cette application suit les interventions et l'argent que l'**abonné** doit. Ce
que la société verse à ses salariés relève de sa comptabilité : une paie
sérieuse suppose des cotisations, des congés, un bulletin conforme — et une
demi-paie est plus dangereuse qu'aucune, parce qu'on finit par s'y fier.

Le circuit des espèces reste, lui, entièrement dans l'application : ce n'est pas
du salaire. Quand l'abonné règle en liquide, cet argent appartient à la société
dès la première seconde et dort simplement dans la poche du technicien jusqu'à
la remise. C'est le dernier maillon du paiement de l'abonné, pas le premier de
la rémunération.

Sur la page « Ma caisse », le technicien voit donc trois chiffres et aucun
salaire : ce qui reste à encaisser sur ses interventions, ce qu'il détient pour
la société, et ce que la société a déjà accusé recevoir.

---

## Courriels

Une intervention pouvait être acceptée, démarrée, close et facturée sans que
l'abonné en apprenne rien s'il ne pensait pas à se reconnecter. C'est l'inverse
du bon sens : celui qui attend chez lui est celui qu'on prévient, pas celui qui
doit aller vérifier.

### Les huit messages

| Quand | À qui | Ce qu'il dit |
|---|---|---|
| Un technicien accepte, ou le superviseur affecte | Abonné | Qui vient, son matricule, son téléphone |
| Le superviseur réaffecte | Abonné | Le technicien a changé |
| Le technicien démarre | Abonné | Il est sur place ; la facture suivra |
| Clôture | Abonné | Le rapport, le détail de la facture, les liens pour régler et imprimer |
| Un règlement est confirmé | Abonné | Le reçu : montant, moyen, référence, reste à payer |
| Le superviseur annule une demande | Abonné | Le motif, et comment en déclarer une autre |
| Le superviseur valide une inscription | Technicien | Son matricule, son secteur, et que ce secteur ne dépend pas de lui |
| Quelqu'un demande un lien de réinitialisation | Le compte visé | Le lien, sa durée, et quoi faire si la demande ne vient pas de lui |

Deux silences sont volontaires. **Rien n'est envoyé quand c'est l'abonné qui
annule sa propre demande** : il vient de cliquer sur le bouton, le lui
apprendre par courriel serait absurde. Et **le reçu part à la confirmation du
règlement, jamais à son ouverture** : un virement annoncé n'est pas un virement
reçu.

Le message de validation comble un trou réel. Un candidat technicien voyait
sa connexion refusée la veille et acceptée le lendemain, sans que rien ne le
lui dise.

### Trois transports, écrits à la main

Aucune dépendance n'a été ajoutée — c'est une règle du projet. `lib/courrier.ts`
compose le message selon la RFC 5322 et parle SMTP directement, en une
soixantaine de lignes de protocole.

| `COURRIER_TRANSPORT` | Ce qu'il fait |
|---|---|
| `fichier` *(défaut)* | Dépose un `.eml` dans `courrier/`, ouvrable dans n'importe quel logiciel de messagerie. Rien ne quitte la machine |
| `smtp` | Envoie réellement. Sélectionné tout seul dès que `SMTP_HOTE` est renseigné |
| `silencieux` | Compose et jette. Utilisé par les tests |

```bash
SMTP_HOTE="smtp.exemple.tn"
SMTP_PORT="587"          # 465 = TLS direct, 587 = STARTTLS
SMTP_UTILISATEUR="contact@fibreconnect.tn"
SMTP_MOTDEPASSE="…"
```

Sans compte d'envoi, l'application reste entièrement utilisable : le mode
`fichier` produit les mêmes messages, sur le disque. C'est une différence de
destination, pas de fonctionnement.

### Deux détails qui décident du reste

**Le corps est toujours en base64.** Ce n'est pas une coquetterie : SMTP
interdit qu'une ligne du corps commence par un point seul — elle terminerait
la transmission au milieu du message — et limite les lignes à 1000 octets. Le
base64 ne contient aucun point et se replie à 76 caractères, donc les deux
pièges disparaissent au lieu d'être contournés. Même raisonnement pour les
en-têtes : « Intervention terminée » n'est pas de l'ASCII, et un accent non
encodé arrive en charabia dans la moitié des logiciels de messagerie.

**Les retours à la ligne sont retirés de tout en-tête.** Les noms viennent du
formulaire d'inscription, donc de l'extérieur : un nom contenant `\r\n`
ajouterait un en-tête arbitraire — un `Bcc:` par exemple — à un message que la
société signe. C'est testé.

### L'envoi ne bloque jamais une intervention

Les notifications partent depuis `after()` de Next.js, c'est-à-dire **après**
que la réponse HTTP est partie. Un technicien qui clôture une intervention
n'attend pas un serveur de courrier devant son téléphone, et un serveur SMTP en
panne ne transforme pas une clôture réussie en erreur à l'écran. Les échecs
sont journalisés côté serveur.

Les fonctions `lettre…` de `lib/courriels.ts` sont **pures** : elles prennent
des valeurs et rendent un message. La formulation se teste donc sans base, sans
serveur de courrier et sans horloge.

---

## Installation

**Prérequis** : Node.js 20.9 ou plus récent.

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env
# puis générer une clé de session :
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# et la coller dans NEXTAUTH_SECRET

# 3. Créer la base et appliquer le schéma
npx prisma migrate dev

# 4. Charger le jeu de données de démonstration
npx prisma db seed

# 5. Lancer l'application
npm run dev
```

L'application démarre sur <http://localhost:3000>.

### Autres commandes

```bash
npm run build       # build de production
npm start           # lancer le build de production
npm test            # règles métier, argent, courriels, réinitialisation (123 tests)
npm run test:watch  # tests en continu pendant le développement
npm run lint        # ESLint
npm run sauvegarde  # instantané horodaté de la base, dans sauvegardes/
npm run creer-superviseur -- --aide   # créer un compte administrateur
npx tsc --noEmit    # vérification des types
npx prisma studio   # explorateur de base de données
npx prisma db seed  # réinitialiser le jeu de données
```

Le seed vide la base avant de la recréer : il est rejouable autant de fois que
nécessaire, et son tirage aléatoire est déterministe (graine fixe), donc deux
exécutions produisent exactement le même jeu de données.

**La sauvegarde utilise `VACUUM INTO`, pas une copie de fichier.** Copier
`dev.db` pendant que l'application tourne peut capturer un fichier déchiré :
SQLite écrit ses pages au fil de l'eau, et une copie prise au milieu d'une
transaction n'en contient que la moitié. `VACUUM INTO` demande à SQLite
lui-même un instantané cohérent, ce qui reste sûr serveur allumé — et c'est le
seul moment où quelqu'un pense à faire une sauvegarde. Les vingt dernières sont
conservées, les plus anciennes s'effacent.

---

## Identifiants de démonstration

Mot de passe commun à tous les comptes : **`Passer123`**

| Rôle | Adresse e-mail | Matricule | Zone |
|---|---|---|---|
| Superviseur | `superviseur@fibreconnect.tn` | — | toutes |
| Technicien | `karim.bouazizi@fibreconnect.tn` | FC-001 | Tunis |
| Technicien | `sonia.trabelsi@fibreconnect.tn` | FC-002 | Ariana |
| Technicien | `mehdi.gharbi@fibreconnect.tn` | FC-003 | Ben Arous |
| Technicien | `amine.jlassi@fibreconnect.tn` | FC-004 | Sfax |
| Technicien | `yosr.hamdi@fibreconnect.tn` | FC-005 | Tunis |

| Rôle | Adresse e-mail | Opérateur | Ville (zone) |
|---|---|---|---|
| Client | `nadia.chaabane@example.tn` | Tunisie Telecom | Tunis (Tunis) |
| Client | `youssef.mansouri@example.tn` | Tunisie Telecom | Ariana (Ariana) |
| Client | `ines.khelifi@example.tn` | Tunisie Telecom | La Marsa (Tunis) |
| Client | `slim.ferchichi@example.tn` | Ooredoo | Ben Arous (Ben Arous) |
| Client | `rania.abdallah@example.tn` | Ooredoo | Sousse (Sousse) |
| Client | `hatem.zouari@example.tn` | Ooredoo | Sfax (Sfax) |

Le jeu de données contient 2 opérateurs, 12 utilisateurs, 33 interventions
réparties sur 6 mois, 106 lignes d'historique, 21 factures, 18 règlements,
4 remises d'espèces et 5 bulletins de paie.

Deux détails du jeu de données sont volontaires et servent la démonstration :

- **Inès habite La Marsa mais relève de la zone Tunis.** C'est le cas qui
  justifie de ne pas comparer les villes.
- **Rania est en zone Sousse, que personne ne couvre.** Sa panne n'apparaît
  chez aucun technicien, et le tableau de bord du superviseur l'affiche en
  alerte. Créez un technicien sur Sousse, ou affectez la panne à la main.
  C'est aussi **la seule panne hors délai** du jeu de données : déclarée il y a
  30 heures en priorité haute, dont le délai est de 24. Les deux faits vont
  ensemble, et c'est tout l'intérêt — une zone sans technicien ne produit pas
  une gêne abstraite, elle fait rater un engagement.
- **Quatre factures restent impayées et un virement reste annoncé.** Sans
  elles, l'écran de paiement du client, celui d'encaissement du technicien et
  la file de confirmation du superviseur se démontreraient vides — ce qui
  n'apprend rien à personne.
- **Quatre techniciens détiennent encore des espèces, un cinquième a déjà
  déclaré sa remise.** Les deux moitiés du circuit de l'argent liquide sont
  donc visibles en même temps.
- **La paie du mois précédent est versée, celle du mois en cours ne l'est pas.**
  Un tableau où toutes les lignes disent « Versée le… » ne montrerait jamais le
  bouton ; un tableau où aucune ne le dit ne montrerait jamais à quoi ressemble
  un mois payé. Le lien « Mois précédent » de la page Finances a ainsi quelque
  chose à montrer.

La page `/login` affiche ces comptes dans un panneau dépliant. Passez
`NEXT_PUBLIC_MODE_DEMO="false"` dans `.env` pour le masquer en production.

### Scénario de démonstration

1. Connectez-vous en **client** (`nadia.chaabane@example.tn`, zone Tunis) et
   déclarez une panne.
2. Connectez-vous en **technicien de la zone Tunis** (`karim.bouazizi@…`) : la
   panne apparaît dans « Pannes disponibles ». Acceptez-la, démarrez-la, puis
   clôturez-la avec un rapport.
3. Connectez-vous en **technicien de Sfax** (`amine.jlassi@…`) : cette même
   panne n'apparaît **jamais**, l'abonné n'étant pas dans sa zone. C'est la
   règle centrale du projet.
4. Revenez en **client** : la timeline montre chaque étape, la facture apparaît
   sous le rapport, et vous pouvez noter l'intervention.
5. Connectez-vous en **superviseur** pour voir les statistiques mises à jour,
   l'alerte sur la zone de Sousse, réaffecter une intervention ou désactiver
   un compte technicien.

### Scénario de démonstration du paiement

Le circuit de l'argent se démontre en trois connexions, sans rien préparer.

**Par carte, du côté de l'abonné.**

1. Connectez-vous en client `slim.ferchichi@example.tn` : deux de ses
   interventions terminées ont une facture non soldée.
2. Ouvrez le suivi de l'une d'elles : la facture est détaillée ligne par ligne
   sous le rapport du technicien.
3. Choisissez « Carte bancaire », puis « Payer ». L'écran de la passerelle
   simulée s'affiche, annonce qu'aucun argent ne circule, et attend votre
   confirmation. Confirmez : la facture passe en « Payée » et le règlement
   s'ajoute au bas de la facture avec sa référence.
4. « Voir la facture à imprimer » ouvre le document complet. Imprimez-le, ou
   enregistrez-le en PDF depuis la boîte d'impression du navigateur.

**En espèces, du côté du technicien.**

5. Connectez-vous en technicien `mehdi.gharbi@fibreconnect.tn` (FC-003) et
   ouvrez « Ma caisse » : la facture restante de Slim y figure.
6. « Encaisser en espèces », le montant est déjà rempli. Validez : la facture
   est soldée, et l'indicateur « Espèces en main » augmente d'autant. Cet
   argent est désormais **dû par le technicien à la société**.
7. « Déclarer la remise » : les espèces quittent la ligne « en main » et
   passent en attente d'accusé de réception.

**Du côté du superviseur.**

8. Connectez-vous en superviseur, page **Finances**. La remise de Mehdi attend
   votre accusé de réception, et un virement annoncé attend d'être pointé sur
   le relevé bancaire.
9. Accusez réception de la remise : elle passe en « Reçue par la société » et
   l'indicateur « Espèces chez les techniciens » baisse.
10. Confirmez le virement : la facture correspondante se solde.
11. En bas de page, le tableau de paie montre pour chaque technicien son fixe,
    sa commission sur ce qu'il a facturé ce mois-ci, et — dans une colonne
    séparée, jamais déduite — les espèces qu'il détient encore.
12. « Enregistrer le versement » sur une ligne : un panneau nomme le technicien,
    le mois et le montant, et redemande confirmation. La ligne passe à
    « Versée le… », et le bouton disparaît — ce mois-là ne peut plus être payé
    une seconde fois. Suivez « Mois précédent » pour voir un mois entièrement
    versé, puis exportez la paie en CSV.

Essayez aussi de confirmer un virement **depuis le compte de l'abonné** : la
route le refuse. C'est la société qui constate l'arrivée de l'argent, pas
celui qui prétend l'avoir envoyé.

### Démonstration de l'inscription technicien

1. Depuis `/login`, suivez « Déposer une candidature » et inscrivez-vous en
   choisissant la zone **Sousse**.
2. Essayez de vous connecter : la connexion est refusée avec « votre compte sera
   actif dès que le superviseur l'aura validé ».
3. En **superviseur**, page Techniciens : la demande est en tête de liste.
   Ouvrez-la, attribuez un matricule, validez.
4. Reconnectez-vous avec le compte technicien : la panne de Rania, que personne
   ne voyait, apparaît enfin — et l'alerte de couverture disparaît du tableau
   de bord.

---

## Règles métier

1. Une intervention est créée par un client avec le statut `NOUVELLE` et sans technicien.
2. **Un technicien ne voit que les interventions `NOUVELLE` dont le client est
   dans la même zone que lui.** C'est la règle centrale : elle est appliquée
   dans la requête SQL, et revérifiée côté serveur à l'acceptation. L'opérateur
   de l'abonné n'entre pas dans ce filtre.
3. Lorsqu'un technicien accepte : statut → `ASSIGNEE` et `technicienId` renseigné.
   Deux techniciens d'une même zone voient la même panne : l'acceptation passe
   par un `updateMany` conditionnel, jamais par une lecture suivie d'une
   écriture, pour qu'un seul l'obtienne.
4. « Démarrer » → `EN_COURS` + `dateDebut`. « Terminer » → `TERMINEE` +
   `dateFin` + rapport obligatoire d'au moins 10 caractères.
5. Le superviseur peut créer un compte technicien, affecter ou réaffecter
   n'importe quelle intervention à n'importe quel technicien — **y compris hors
   de sa zone**, ce que l'historique consigne mot pour mot. C'est le seul
   recours quand une zone n'a personne. Il peut aussi désactiver un compte,
   ce qui n'est jamais bloqué : si des interventions sont encore ouvertes,
   l'interface les compte et le signale avant de confirmer.
6. Seul un compte `ACTIF` peut se connecter. `EN_ATTENTE` et `DESACTIVE` sont
   refusés, avec des messages distincts — une inscription en cours d'examen
   n'est pas un rejet.
7. Le client peut noter (1 à 5) une intervention `TERMINEE`, une seule fois.
8. Le client comme le superviseur peuvent annuler une intervention tant qu'elle
   n'est ni terminée ni déjà annulée. Un technicien ne le peut pas.
9. Un technicien peut s'inscrire seul depuis `/register/technicien`. Son compte
   naît `EN_ATTENTE`, sans matricule et marqué indisponible. Le superviseur lui
   attribue matricule et zone, ce qui l'active — en un seul geste, dans une
   transaction, pour qu'aucun état intermédiaire absurde n'existe (compte actif
   sans matricule, ou technicien affecté qui ne peut pas se connecter).
10. La zone d'un technicien n'est pas dans le profil qu'il modifie lui-même :
    elle décide des pannes qui lui sont proposées, la choisir reviendrait à
    choisir son travail. Seul le superviseur la change.
11. La clôture émet la facture **dans la même transaction**. Une intervention
    terminée a toujours exactement une facture, et une facture n'existe pas sans
    intervention terminée.
12. Une facture n'est soldée que par des paiements **confirmés**. Un virement
    annoncé ne réduit rien tant que le superviseur ne l'a pas vu sur le relevé,
    et l'abonné ne peut pas confirmer le sien.
13. Les espèces encaissées par un technicien créent une dette de celui-ci envers
    la société. Elle s'éteint en deux temps volontairement distincts : le
    technicien **déclare** la remise, le superviseur **accuse réception**.
    Confondre les deux reviendrait à croire sur parole un mouvement d'espèces.
14. Le montant d'une remise n'est jamais envoyé par le client : il est calculé
    côté serveur à partir des encaissements non encore versés. Un champ libre
    permettrait de déclarer 200 DT en en gardant 400.
15. Une facture peut être **corrigée ou annulée par le superviseur tant qu'aucun
    règlement n'a été confirmé**, avec un motif obligatoire que l'abonné lit sur
    son exemplaire. Après un règlement, même partiel, elle est figée.
16. Chaque priorité porte un **délai de prise en charge**. Une panne encore
    `NOUVELLE` au-delà de son délai est *hors délai* ; dès qu'un technicien
    accepte, le chronomètre s'arrête et ne repart pas.
17. Le tableau de bord du technicien classe par **temps restant**, pas par
    étiquette de priorité, pour que la liste et les badges disent la même chose.
18. Les lignes de facture sont **hors taxes** ; la TVA et le droit de timbre
    s'ajoutent au pied, avec un taux **figé sur la facture** — une facture
    ancienne doit se relire avec les taux de son époque.
19. L'abonné est **prévenu par courriel** à chaque étape qui le concerne :
    prise en charge, démarrage, clôture avec la facture, reçu de règlement,
    annulation par la société. Pas quand c'est lui qui annule.

### Ces règles sont testées

`npm test` exécute 123 tests.

**18** portent sur les règles métier et tournent contre une base
SQLite jetable, construite à partir des vraies migrations : cycle complet des
statuts, refus des transitions illégales, absence d'écriture d'historique quand
une transition est refusée, filtre par zone, contrôles de propriété, notation
unique.

Deux d'entre eux méritent d'être signalés :

- **Le filtre ignore l'opérateur.** Les deux abonnés du jeu de test partagent le
  même opérateur et diffèrent par la zone. Si la règle centrale retombait un
  jour sur `operateurId`, ce test échouerait — alors qu'avec deux opérateurs
  différents il aurait passé pour la mauvaise raison.
- **L'acceptation concurrente.** Deux techniciens de la même zone acceptent la
  même panne en parallèle : le test vérifie qu'un seul `updateMany` touche une
  ligne, l'autre zéro.

**12** portent sur la limitation des tentatives de connexion. Le
limiteur reçoit l'instant courant en paramètre, si bien qu'une fenêtre de
quinze minutes se vérifie en quelques microsecondes et que le résultat ne
dépend jamais de la vitesse de la machine.

**13** portent sur la pagination : qu'aucune ligne ne soit sautée ni
comptée deux fois en parcourant toutes les pages, qu'une URL bricolée à la main
retombe sur une page valide, et que les liens de page conservent les filtres.

**28** portent sur l’argent, et vérifient qu'on ne peut ni en créer ni
en perdre par les chemins que l'application propose :

- une confirmation de paiement **rejouée trois fois** ne compte l'encaissement
  qu'une seule fois ;
- un virement `EN_ATTENTE` ne solde rien ;
- on ne peut pas encaisser plus que le reste dû, ni ouvrir un paiement sur une
  facture déjà soldée, ni payer en espèces depuis l'espace client ;
- si la facturation échoue, la clôture est annulée et l'intervention reste
  `EN_COURS` — jamais de travaux sans facture ;
- un total de facture est **exactement** la somme des lignes affichées ;
- une remise déclarée deux fois est refusée, un accusé de réception donné deux
  fois aussi ;
- une facture ne se corrige ni ne s'annule dès qu'un règlement est confirmé, et
  une facture annulée sort du chiffre d'affaires ;
- une facture porte son propre taux de TVA et son propre timbre, et son total
  TTC est toujours la somme du hors-taxes, de la TVA et du timbre — y compris
  après une correction.

**7** portent sur l'export comptable : qu'un point-virgule ou un guillemet dans
une désignation n'ouvre pas une colonne de plus, et qu'une valeur commençant par
`=`, `+`, `-` ou `@` soit neutralisée — Excel l'exécuterait comme une formule,
ce qui fait d'un champ de facture un vecteur d'attaque sur le poste du
comptable.

**19** portent sur les courriels. La moitié vérifie la composition du message :
qu'un sujet accentué se recolle exactement après découpage en mots encodés,
qu'aucune ligne du corps ne commence par un point — celle-là terminerait la
transmission SMTP au milieu du message — et qu'un nom d'utilisateur contenant
un retour à la ligne ne peut pas ajouter d'en-tête au message. L'autre moitié
fait parler le client SMTP à un **vrai serveur SMTP lancé par le test**, sur un
port au hasard : accueil, `EHLO`, authentification, enveloppe, `DATA`. Du code
de protocole écrit à la main auquel personne ne parle jamais est du code de
protocole dont personne ne sait qu'il est cassé.

**14** portent sur la réinitialisation de mot de passe, et sont écrits à
l'envers : ils vérifient ce qui ne doit **pas** arriver. Que le jeton ne soit
pas relisible depuis la base, qu'il ne survive pas à son heure, qu'il ne
fonctionne pas deux fois — y compris quand deux soumissions partent en même
temps — qu'une demande n'ouvre rien sur un compte en attente ou désactivé, et
que demander un lien ne ferme pas la porte de connexion de la personne.

**12** portent sur les délais et sur les deux formats que les exports
utilisent. Tous sont des **fonctions pures** auxquelles l'instant courant est
passé en paramètre : un objectif de quatre heures se vérifie en microsecondes
au lieu de s'attendre, et le résultat ne dépend jamais de l'heure à laquelle la
suite tourne. Ils vérifient notamment qu'une panne acceptée n'est jamais hors
délai quel que soit son âge, qu'un `priorite` inconnu retombe sur le délai
normal sans disparaître du décompte, et qu'un paramètre `mois` bricolé à la main
retombe sur le mois en cours au lieu de casser la page.

### Traçabilité

**Toute** transition de statut écrit une ligne dans `Historique`. Elle passe
obligatoirement par la fonction unique `changerStatut()` de
`lib/interventions.ts`, qui, dans une **transaction Prisma** :

1. vérifie que la transition est autorisée (`TRANSITIONS_STATUT`) ;
2. met à jour l'intervention ;
3. crée la ligne d'historique correspondante.

Si l'une des trois opérations échoue, aucune n'est appliquée. Aucune route ne
modifie `statut` directement.

---

## Architecture

```
app/
  page.tsx                 page de garde
  login/  register/        authentification
  client/  technicien/  superviseur/
                           un layout par espace, protégé par son rôle
  api/                     Route Handlers, réponses { data } ou { error }
components/
  ui/                      badges, boutons, champs, surfaces, squelettes
  navigation/              coquille applicative, rail latéral, notifications
  interventions/           lignes de liste, filtres, actions métier
  facturation/             facture, paiement, encaissement, remises
  graphiques/              graphiques recharts du superviseur
  carte/                   carte Leaflet (chargée côté navigateur uniquement)
  timeline-intervention.tsx  élément signature
lib/
  constants.ts             valeurs autorisées, libellés, couleurs de statut
  prisma.ts                singleton du client Prisma
  interventions.ts         changerStatut() et contrôles de propriété
  facturation.ts           émission, solde, encaissement, remises
  monnaie.ts               montants en millimes, jamais en décimaux
  societe.ts               identité imprimée en tête de facture
  courrier.ts              composition RFC 5322 et client SMTP
  courriels.ts             les huit messages et le moment où ils partent
  reinitialisation.ts      jetons de mot de passe oublié
  validations.ts           schémas zod
  session.ts               exigerRole(), utilisateurConnecte()
  api.ts                   réponses et gestion d'erreurs communes
  statistiques.ts          calculs du tableau de bord superviseur
  notifications.ts         alertes dérivées des données
  filtres.ts  dates.ts     filtres d'URL, formatage des dates
  pagination.ts            bornes de page, liens qui gardent les filtres
  limitation.ts            blocage des tentatives de connexion
  televersement.ts         enregistrement et contrôle des photos
scripts/
  sauvegarde.ts            instantané SQLite cohérent (VACUUM INTO)
  creer-superviseur.ts     création du compte administrateur
proxy.ts                   protection des routes par rôle
prisma/
  schema.prisma  seed.ts  migrations/
```

Les composants sont des **Server Components** par défaut. `"use client"` n'est
utilisé que pour les formulaires, les graphiques, la carte et les quelques
éléments interactifs (cloche de notifications, barre de filtres).

---

## Sécurité

- **Mots de passe** hachés avec bcrypt (10 rounds). Jamais stockés ni renvoyés
  en clair, y compris par l'API de session.
- **Deux niveaux de contrôle.** `proxy.ts` filtre par URL en lisant le rôle dans
  le JWT signé, sans requête SQL. Chaque page et chaque route API revérifient
  ensuite le rôle **et la propriété** de la ressource : un technicien ne peut
  pas modifier l'intervention d'un collègue par un appel direct à l'API, un
  client ne peut pas consulter la demande d'un autre.
- **Validation zod** sur tous les payloads entrants.
- **Énumération d'adresses** empêchée : une adresse inconnue déclenche quand
  même une comparaison bcrypt, pour que le temps de réponse ne trahisse pas
  l'existence du compte. Mesuré : 50,4 ms contre 50,3 ms, soit 0,2 % d'écart.
- **Force brute** freinée par deux compteurs indépendants (`lib/limitation.ts`) :
  5 échecs sur une même adresse e-mail, ou 20 depuis une même adresse IP,
  bloquent la connexion pendant 15 minutes. Le seuil par IP existe pour arrêter
  la pulvérisation d'un mot de passe sur beaucoup de comptes, que le compteur
  par compte ne verrait jamais. Une tentative bloquée est refusée **avant** le
  calcul bcrypt, pour que la protection ne devienne pas elle-même un moyen de
  saturer le serveur.
- **En-têtes de sécurité** posés sur toutes les réponses (`next.config.ts`) :
  Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, Referrer-Policy et Permissions-Policy. La CSP n'autorise qu'une
  seule origine externe, les tuiles OpenStreetMap de la carte.
- **Photos** servies par une route authentifiée (`/api/photos/[nom]`) et non
  depuis `public/` : le nom doit correspondre exactement au format UUID que
  nous générons, ce qui interdit toute remontée de dossier. Le format d'image
  est vérifié sur les octets du fichier, pas sur son extension.
- **Redirection ouverte** empêchée : le paramètre `callbackUrl` n'est accepté
  que s'il désigne un chemin interne.
- **Réinitialisation de mot de passe** (`lib/reinitialisation.ts`) : le jeton
  n'est **jamais stocké**, seule son empreinte SHA-256 l'est — une base dérobée
  ne doit pas livrer des liens utilisables. Il vaut 32 octets tirés au sort,
  expire en une heure, et sa consommation est un `updateMany` conditionnel,
  donc deux soumissions simultanées du même lien ne peuvent pas aboutir toutes
  les deux. Le formulaire de demande répond **exactement la même chose** que
  l'adresse existe ou non, sans quoi il deviendrait un annuaire des abonnés ;
  et il porte son propre plafond, distinct de celui de la connexion, parce que
  chaque appel envoie un courriel.
- **Argent.** Aucun montant ne vient du navigateur : le reste à payer est
  toujours recalculé côté serveur, le montant d'une remise est déduit des
  encaissements en base, et un technicien ne peut encaisser que sur les
  factures de ses propres interventions (403 sinon). La référence d'un paiement
  est unique, ce qui rend une notification rejouée sans effet.
- **Erreurs techniques** journalisées côté serveur et jamais renvoyées au
  navigateur.

> Next.js 16 a renommé `middleware.ts` en `proxy.ts` (même rôle, runtime Node au
> lieu de edge). Le fichier `proxy.ts` remplit la fonction décrite dans le
> cahier des charges sous le nom de middleware.

---

## Direction visuelle

Le sujet est la fibre : de la lumière qui parcourt une distance et s'atténue.

- **Palette** — bleu nuit `#0B1D3A`, cyan signal `#22D3EE`, blanc cassé
  `#F5F7FA`, gris ardoise `#64748B`, ambre `#F59E0B`. Le cyan est réservé aux
  éléments actifs et aux traits de liaison, jamais en aplat de fond.
- **Page de garde** — une trace de réflectométrie (OTDR), la courbe que lit un
  technicien fibre, avec ses pics à chaque connecteur et chaque épissure.
- **Typographie** — Archivo pour les titres, IBM Plex Sans pour le texte,
  IBM Plex Mono pour les identifiants, matricules, dates et coordonnées.
- **Surfaces** — filets de 1 px et angles à 2 px, aucune carte arrondie à ombre
  portée. L'élément actif est marqué d'une arête cyan à gauche.
- **Élément signature** — sur la timeline d'une intervention, un trait cyan
  parcouru par une lueur qui progresse : le signal qui avance dans le câble.
  C'est la **seule** animation du projet, et elle disparaît entièrement sous
  `prefers-reduced-motion`.
- **Couleurs de statut**, constantes partout (badges, tableaux, graphiques) :
  `NOUVELLE` ardoise, `ASSIGNEE` bleu, `EN_COURS` ambre, `TERMINEE` vert,
  `ANNULEE` rouge.
- **Responsive** — rail latéral sur grand écran, barre d'onglets en bas sur
  téléphone, pour que le technicien atteigne la navigation au pouce. Testé
  jusqu'à 375 px de large.

### Ce que « responsive » veut dire ici

Le cahier des charges demande que l'application soit utilisable par un
technicien debout devant un point de branchement. Cela va au-delà d'une mise en
page qui se replie :

- **Cibles tactiles de 44 px.** Les boutons d'action — « Accepter
  l'intervention », « Démarrer » — mesuraient 28 px de haut : trop petits pour
  un pouce. La variante `pointer-coarse:` les porte à 44 px sur écran tactile
  **sans** relâcher la densité au clavier-souris.
- **Délai de double-tap supprimé.** Sans `touch-action: manipulation`, un
  navigateur mobile attend 300 ms après chaque appui pour voir si un second
  arrive. Toute l'application paraissait lente.
- **Encoche respectée.** La barre de navigation du bas était recouverte par
  l'indicateur d'accueil d'un iPhone. `env(safe-area-inset-bottom)`, combiné à
  `viewportFit: "cover"`, la repousse au-dessus.

### Accessibilité

- **Lien d'évitement** en première cible du clavier : sans lui, il faut
  traverser toute la navigation à chaque page avant d'atteindre le contenu.
- **Focus clavier visible** partout, y compris sur fond sombre, jamais
  supprimé sans remplacement.
- **Le panneau d'alertes** est annoncé comme un dialogue, et `Échap` y rend le
  focus à la cloche plutôt que de le laisser retomber en haut de page.
- **Aucun bouton grisé sans explication.** Un bouton d'envoi désactivé
  n'apprend rien : les formulaires restent actifs, valident à la soumission et
  renvoient la personne sur le champ fautif avec ce qui manque.
- **Le correcteur orthographique est coupé** sur les adresses e-mail, les
  matricules et les numéros de contrat, qu'il soulignait en rouge à tort.

### Typographie française

L'espace insécable est posée avant `? ! ; :` et à l'intérieur des guillemets
`« »`, selon l'usage français — une ponctuation double ne doit jamais se
retrouver seule en début de ligne.

---

## Choix techniques notables

**Prisma 6 plutôt que 7.** Prisma 7 impose un *driver adapter* pour SQLite et un
fichier `prisma.config.ts` réclamant `dotenv` : deux dépendances de plus et un
client généré hors de `@prisma/client`. La version 6 correspond au flux
classique décrit dans le cahier des charges.

**Filtres, recherche et pagination dans l'URL.** Les listes restent des pages
rendues côté serveur, une vue filtrée se partage par simple copie du lien, et le
bouton « précédent » du navigateur se comporte normalement. La navigation entre
pages est faite de vrais liens : un clic du milieu ouvre la page 3 dans un
nouvel onglet, et la version imprimée ne montre pas les boutons.

Deux pièges de pagination sont traités explicitement, parce qu'ils ne se voient
qu'une fois en production :

- changer un filtre depuis la page 5 remettrait devant une liste vide alors que
  le résultat tient sur une page — `BarreFiltres` efface donc `page` à chaque
  changement de critère ;
- `?page=999` ou `?page=-3` bricolés à la main retombent sur une page valide au
  lieu de produire un `skip` négatif ou un écran vide.

**Notifications dérivées, pas stockées.** Il n'existe pas de table
`Notification` : chaque alerte est recalculée à partir des interventions. Rien
ne peut donc contredire la base, et aucune migration supplémentaire n'est
nécessaire. En contrepartie, il n'y a pas d'état « lu ».

**Export PDF par la fonction d'impression du navigateur.** Les fiches sont mises
en page pour le papier via `@media print`, plutôt que d'embarquer une
bibliothèque PDF. « Enregistrer au format PDF » est disponible dans la boîte de
dialogue d'impression de tous les systèmes.

**Aucune information ne dépend d'un seul contrôle.** Le proxy filtre par URL,
mais chaque page et chaque route API revérifient le rôle *et* la propriété de
la ressource. Cacher un bouton n'est pas un contrôle d'accès : les tests
vérifient qu'un technicien ne peut pas toucher l'intervention d'un collègue et
qu'un abonné ne peut pas lire celle d'un autre, même en appelant l'API
directement.

**Photos stockées sur le disque local**, dans `televersements/` à la racine du
projet — délibérément **pas** dans `public/`. Un build de production sert
`public/` depuis un instantané pris au moment de la compilation : un fichier
écrit ensuite renverrait 404. Elles passent donc par la route `/api/photos/
[nom]`, qui se comporte de la même façon en développement et en production. Le
nom de fichier est tiré au sort et le format est vérifié sur les octets du
fichier, pas sur son extension.

**Logos et portraits dégradent proprement.** Les logos des opérateurs
partenaires sont leur propriété et n'accompagnent pas ce dépôt ; le superviseur
les téléverse depuis `/superviseur/reseaux`. Tant qu'aucun fichier n'est posé,
l'interface affiche un monogramme (« TT », « OO ») et les initiales du
technicien — jamais un carré vide ni une silhouette grise.

**Accessibilité des couleurs.** Les couleurs de statut imposées par le cahier
des charges ont été passées à un validateur de contraste : « Terminée » (vert)
et « Annulée » (rouge) ne sont pas distinguables par une personne atteinte de
deutéranopie (ΔE 5,0 pour un seuil de 8). La palette a été conservée, mais
**aucune information ne repose sur la couleur seule** : chaque badge porte son
libellé, chaque barre de graphique affiche sa valeur, chaque série est nommée
dans une légende, et le tableau de bord propose une table de repli.

Les couleurs elles-mêmes ont été re-mesurées plutôt que choisies à l'œil : les
évidents `#16A34A` / `#DC2626` donnent ΔE 5,0 sous deutéranopie, sous le seuil
de 8. La paire retenue est `#15803D` / `#921C1C` (ΔE 8,7), séparée sur la
clarté — le seul canal qu'un daltonisme laisse intact. Le graphique temporel
utilise `#1D4ED8` / `#15803D`, ΔE 27,3.

---

## Limites connues

Elles sont listées ici parce qu'un projet honnête dit où il s'arrête.

**Le blocage des tentatives est en mémoire.** Il repart de zéro au redémarrage
du serveur et n'est pas partagé entre plusieurs instances. C'est exactement la
forme de déploiement de cette application — un processus Node à côté d'un
fichier SQLite — donc la protection est effective ; une mise à l'échelle
horizontale demanderait un magasin partagé.

**Le blocage par compte peut être retourné contre un utilisateur.** Quelqu'un
qui connaît une adresse e-mail peut la faire bloquer 15 minutes en échouant
cinq fois. C'est le compromis classique du verrouillage de compte : on préfère
une gêne bornée et réversible à une force brute illimitée.

**Deux `'unsafe-inline'` subsistent dans la CSP**, sur les scripts et les
styles. Next.js publie sa charge d'hydratation en `<script>` inline et Tailwind
comme Leaflet écrivent des attributs `style`. Les supprimer demande de générer
un *nonce* par requête et de le faire traverser le framework — un travail réel,
à refaire à chaque montée de version.

**Deux calculs lisent encore toutes les lignes.** La carte des abonnés charge
tous les points, ce qui est voulu — une carte paginée n'aurait pas de sens, on y
cherche justement ce qui est loin du reste ; la *liste* sous la carte, elle, est
paginée. Et l'historique du technicien calcule ses moyennes sur l'ensemble de
ses interventions terminées : la liste affichée est paginée, mais la durée
moyenne lit encore toutes les lignes — SQLite ne sait pas faire la moyenne d'une
différence de dates sans SQL brut.

**`notFound()` renvoie 200 au lieu de 404.** Comportement de Next 16 en rendu
par flux : la réponse a déjà commencé à partir quand la page appelle
`notFound()`. La page « introuvable » s'affiche correctement et aucune donnée
ne fuit — seul le code HTTP est inexact.

**SQLite et disque local.** Le cahier des charges impose SQLite ; la base est un
fichier et les photos sont à côté. Un hébergement au système de fichiers
éphémère perdrait les deux à chaque redémarrage.

**Aucun paiement réel n'est encaissé.** La passerelle est simulée et l'écran le
dit. Stripe n'accepte pas les comptes marchands tunisiens ; brancher Paymee ou
Flouci demande un contrat commercial signé. Le découpage en deux temps
(`ouvrirPaiement` puis `confirmerPaiement`, dans `lib/facturation.ts`) est
précisément celui qu'attendent ces prestataires : la confirmation viendrait
d'un webhook au lieu d'un bouton.

**Une facture déjà réglée ne se corrige pas.** Le superviseur peut corriger ou
annuler une facture tant qu'aucun règlement n'a été confirmé, mais après un
encaissement — même partiel — elle est figée. Le geste juste serait alors un
**avoir**, qui laisse la facture d'origine intacte et lui oppose un document de
sens contraire. Il demande une table de plus et, surtout, de renoncer à la
relation un-à-un entre intervention et facture, puisqu'il faudrait pouvoir en
réémettre une. C'est un choix de modélisation, pas un oubli.

**Un seul taux de TVA, appliqué à toute la facture.** Les 19 % valent pour
l'ensemble des lignes. Une pièce détachée relevant d'un taux différent
demanderait un taux **par ligne** et des sous-totaux par taux — un changement de
modèle, et surtout une question comptable : savoir ce qui est assujetti à quoi
n'est pas une décision technique.

**Un courriel perdu ne laisse aucune trace en base.** Il n'y a pas de table de
journal d'envoi, pour la même raison qu'il n'y a pas de table `Notification` :
un doublon est déjà impossible, puisque chaque message suit une transition que
`changerStatut` refuse de rejouer. En contrepartie, un message refusé par le
serveur de courrier n'apparaît que dans le journal du serveur — et dans
`courrier/` quand le transport fichier est actif. Il n'y a pas non plus de file
d'attente : un envoi échoué n'est pas réessayé.

**Le chiffrement SMTP n'est pas couvert par les tests.** Le dialogue complet
l'est, contre un vrai serveur SMTP lancé par le test lui-même — mais TLS se
négocie en dessous et demanderait un certificat. C'est la partie du client
qu'il faudra vérifier contre le premier hébergeur réel.
