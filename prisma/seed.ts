/**
 * Demo dataset for FibreConnect. Run with `npx prisma db seed`.
 *
 * The script wipes the database first, so it is safe to run again after any
 * change. Every demo account shares the same password (see MOT_DE_PASSE_DEMO),
 * hashed with bcrypt exactly like a real signup.
 *
 * History rows are written by hand here. From step 8 onwards the application
 * itself must go through `changerStatut()` in lib/interventions.ts instead.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  BCRYPT_ROUNDS,
  TYPE_PANNE_LABELS,
  tarifDe,
  type MoyenPaiement,
  type Priorite,
  type Statut,
  type TypePanne,
  type Zone,
} from "../lib/constants";

const prisma = new PrismaClient();

const MOT_DE_PASSE_DEMO = "Passer123";

/** Une date située `heures` heures dans le passé. */
const maintenant = Date.now();
const ilYa = (heures: number) => new Date(maintenant - heures * 3600 * 1000);

/** Une transition de statut appliquée après la création de l'intervention. */
type Etape = {
  action: string;
  vers: Statut;
  ilYaHeures: number;
  /** false quand l'action vient du client ou du superviseur. */
  parLeTechnicien?: boolean;
  commentaire?: string;
};

async function main() {
  console.log("Nettoyage de la base...");
  // Ordre imposé par les clés étrangères : les enfants d'abord.
  await prisma.paiement.deleteMany();
  await prisma.versement.deleteMany();
  await prisma.ligneFacture.deleteMany();
  await prisma.facture.deleteMany();
  await prisma.historique.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.technicien.deleteMany();
  await prisma.client.deleteMany();
  await prisma.utilisateur.deleteMany();
  await prisma.operateur.deleteMany();

  const motDePasse = await bcrypt.hash(MOT_DE_PASSE_DEMO, BCRYPT_ROUNDS);

  /* ---------------------------------------------------------------------- */
  /* Opérateurs                                                             */
  /* ---------------------------------------------------------------------- */

  // FibreConnect depanne les abonnes de ces deux reseaux. Ses techniciens ne
  // sont rattaches a aucun des deux : ce sont ses propres employes.
  console.log("Création des opérateurs...");
  const tunisieTelecom = await prisma.operateur.create({
    data: { nom: "Tunisie Telecom" },
  });
  const ooredoo = await prisma.operateur.create({ data: { nom: "Ooredoo" } });

  /* ---------------------------------------------------------------------- */
  /* Superviseur                                                            */
  /* ---------------------------------------------------------------------- */

  console.log("Création du superviseur...");
  const superviseur = await prisma.utilisateur.create({
    data: {
      email: "superviseur@fibreconnect.tn",
      motDePasse,
      role: "SUPERVISEUR",
      nom: "Ben Salah",
      prenom: "Leila",
      telephone: "+216 71 234 567",
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Techniciens                                                            */
  /* ---------------------------------------------------------------------- */

  // Le matricule suit l'employe, plus le reseau : FC-001, FC-002...
  console.log("Création des techniciens...");

  function creerTechnicien(donnees: {
    email: string;
    nom: string;
    prenom: string;
    telephone: string;
    matricule: string;
    specialite: string;
    zone: Zone;
  }) {
    const { email, nom, prenom, telephone, ...profil } = donnees;
    return prisma.technicien.create({
      data: {
        ...profil,
        utilisateur: {
          create: {
            email,
            motDePasse,
            role: "TECHNICIEN",
            nom,
            prenom,
            telephone,
          },
        },
      },
      include: { utilisateur: true },
    });
  }

  const karim = await creerTechnicien({
    email: "karim.bouazizi@fibreconnect.tn",
    nom: "Bouazizi",
    prenom: "Karim",
    telephone: "+216 98 111 222",
    matricule: "FC-001",
    specialite: "Raccordement FTTH",
    zone: "Tunis",
  });

  const sonia = await creerTechnicien({
    email: "sonia.trabelsi@fibreconnect.tn",
    nom: "Trabelsi",
    prenom: "Sonia",
    telephone: "+216 98 333 444",
    matricule: "FC-002",
    specialite: "Soudure et mesure optique",
    zone: "Ariana",
  });

  const mehdi = await creerTechnicien({
    email: "mehdi.gharbi@fibreconnect.tn",
    nom: "Gharbi",
    prenom: "Mehdi",
    telephone: "+216 55 555 666",
    matricule: "FC-003",
    specialite: "Équipements ONT et routeurs",
    zone: "Ben Arous",
  });

  const amine = await creerTechnicien({
    email: "amine.jlassi@fibreconnect.tn",
    nom: "Jlassi",
    prenom: "Amine",
    telephone: "+216 22 777 888",
    matricule: "FC-004",
    specialite: "Diagnostic réseau",
    zone: "Sfax",
  });

  // Deuxieme technicien sur Tunis : sans lui, la zone la plus chargee du jeu
  // de donnees n'aurait qu'un seul intervenant, et la reaffectation par le
  // superviseur n'aurait personne vers qui aller.
  const yosr = await creerTechnicien({
    email: "yosr.hamdi@fibreconnect.tn",
    nom: "Hamdi",
    prenom: "Yosr",
    telephone: "+216 24 999 000",
    matricule: "FC-005",
    specialite: "Raccordement FTTH et mesures",
    zone: "Tunis",
  });

  /* ---------------------------------------------------------------------- */
  /* Clients                                                                */
  /* ---------------------------------------------------------------------- */

  console.log("Création des clients...");

  function creerClient(donnees: {
    email: string;
    nom: string;
    prenom: string;
    telephone: string;
    operateurId: string;
    adresse: string;
    ville: string;
    /** Gouvernorat : c'est lui qui decide quel technicien voit la panne. */
    zone: Zone;
    numContrat: string;
    latitude: number;
    longitude: number;
  }) {
    const { email, nom, prenom, telephone, operateurId, ...profil } = donnees;
    return prisma.client.create({
      data: {
        ...profil,
        operateur: { connect: { id: operateurId } },
        utilisateur: {
          create: {
            email,
            motDePasse,
            role: "CLIENT",
            nom,
            prenom,
            telephone,
          },
        },
      },
      include: { utilisateur: true },
    });
  }

  // Coordonnées réelles des villes concernées.
  //
  // Noter que `ville` et `zone` ne coincident pas toujours : Inès habite
  // La Marsa, qui releve du gouvernorat de Tunis. C'est precisement pour ce
  // genre de cas que le filtre porte sur la zone et non sur la ville.
  const nadia = await creerClient({
    email: "nadia.chaabane@example.tn",
    nom: "Chaabane",
    prenom: "Nadia",
    telephone: "+216 20 101 101",
    operateurId: tunisieTelecom.id,
    adresse: "12 avenue Habib Bourguiba",
    ville: "Tunis",
    zone: "Tunis",
    numContrat: "TT-2024-0001",
    latitude: 36.8065,
    longitude: 10.1815,
  });

  const youssef = await creerClient({
    email: "youssef.mansouri@example.tn",
    nom: "Mansouri",
    prenom: "Youssef",
    telephone: "+216 20 202 202",
    operateurId: tunisieTelecom.id,
    adresse: "45 rue de l'Indépendance",
    ville: "Ariana",
    zone: "Ariana",
    numContrat: "TT-2024-0002",
    latitude: 36.8625,
    longitude: 10.1956,
  });

  const ines = await creerClient({
    email: "ines.khelifi@example.tn",
    nom: "Khelifi",
    prenom: "Inès",
    telephone: "+216 20 303 303",
    operateurId: tunisieTelecom.id,
    adresse: "8 rue du Golfe",
    ville: "La Marsa",
    zone: "Tunis",
    numContrat: "TT-2024-0003",
    latitude: 36.8783,
    longitude: 10.3247,
  });

  const slim = await creerClient({
    email: "slim.ferchichi@example.tn",
    nom: "Ferchichi",
    prenom: "Slim",
    telephone: "+216 20 404 404",
    operateurId: ooredoo.id,
    adresse: "23 rue des Oliviers",
    ville: "Ben Arous",
    zone: "Ben Arous",
    numContrat: "OO-2024-0004",
    latitude: 36.7533,
    longitude: 10.2278,
  });

  // Sousse n'a volontairement aucun technicien : le superviseur doit voir
  // qu'une zone est decouverte, et pouvoir y affecter quelqu'un a la main.
  const rania = await creerClient({
    email: "rania.abdallah@example.tn",
    nom: "Abdallah",
    prenom: "Rania",
    telephone: "+216 20 505 505",
    operateurId: ooredoo.id,
    adresse: "5 avenue Léopold Senghor",
    ville: "Sousse",
    zone: "Sousse",
    numContrat: "OO-2024-0005",
    latitude: 35.8256,
    longitude: 10.6084,
  });

  // Anciennement abonne Orange : la societe ne travaille plus avec ce reseau,
  // son contrat a ete repris par Ooredoo.
  const hatem = await creerClient({
    email: "hatem.zouari@example.tn",
    nom: "Zouari",
    prenom: "Hatem",
    telephone: "+216 20 606 606",
    operateurId: ooredoo.id,
    adresse: "17 route de Gabès",
    ville: "Sfax",
    zone: "Sfax",
    numContrat: "OO-2024-0006",
    latitude: 34.7406,
    longitude: 10.7603,
  });

  /* ---------------------------------------------------------------------- */
  /* Interventions et historiques                                           */
  /* ---------------------------------------------------------------------- */

  console.log("Création des interventions...");

  /**
   * Crée une intervention, déroule ses transitions de statut et écrit une
   * ligne d'historique pour chacune (plus une ligne pour la création).
   * Le statut final, `dateDebut` et `dateFin` sont déduits des étapes.
   */
  async function creerIntervention(params: {
    clientId: string;
    technicienId?: string;
    superviseurId?: string;
    typePanne: TypePanne;
    priorite: Priorite;
    description: string;
    creeeIlYaHeures: number;
    etapes: Etape[];
    rapport?: string;
    noteClient?: number;
  }) {
    const dateCreation = ilYa(params.creeeIlYaHeures);
    const derniere = params.etapes.at(-1);
    const statut: Statut = derniere ? derniere.vers : "NOUVELLE";

    const etapeDebut = params.etapes.find((e) => e.vers === "EN_COURS");
    const etapeFin = params.etapes.find((e) => e.vers === "TERMINEE");

    const intervention = await prisma.intervention.create({
      data: {
        clientId: params.clientId,
        technicienId: params.technicienId ?? null,
        superviseurId: params.superviseurId ?? null,
        typePanne: params.typePanne,
        priorite: params.priorite,
        description: params.description,
        statut,
        dateCreation,
        dateDebut: etapeDebut ? ilYa(etapeDebut.ilYaHeures) : null,
        dateFin: etapeFin ? ilYa(etapeFin.ilYaHeures) : null,
        rapport: params.rapport ?? null,
        noteClient: params.noteClient ?? null,
      },
    });

    // Ligne 1 : la déclaration par le client.
    await prisma.historique.create({
      data: {
        interventionId: intervention.id,
        technicienId: null,
        action: "CREATION",
        ancienStatut: null,
        nouveauStatut: "NOUVELLE",
        dateAction: dateCreation,
        commentaire: "Panne déclarée par le client",
      },
    });

    // Puis une ligne par transition, en chaînant ancien -> nouveau statut.
    let statutPrecedent: Statut = "NOUVELLE";
    for (const etape of params.etapes) {
      await prisma.historique.create({
        data: {
          interventionId: intervention.id,
          technicienId: etape.parLeTechnicien ? (params.technicienId ?? null) : null,
          action: etape.action,
          ancienStatut: statutPrecedent,
          nouveauStatut: etape.vers,
          dateAction: ilYa(etape.ilYaHeures),
          commentaire: etape.commentaire ?? null,
        },
      });
      statutPrecedent = etape.vers;
    }

    return intervention;
  }

  // --- 4 interventions NOUVELLE, dans quatre zones differentes.
  // Le filtre par zone se demontre en comparant les tableaux de bord : Karim
  // (Tunis) voit celle de Nadia, jamais celle de Slim (Ben Arous).
  await creerIntervention({
    clientId: nadia.id,
    typePanne: "COUPURE_TOTALE",
    priorite: "URGENTE",
    description:
      "Plus aucune connexion depuis ce matin. Le voyant PON de la box clignote en rouge.",
    creeeIlYaHeures: 3,
    etapes: [],
  });

  await creerIntervention({
    clientId: hatem.id,
    typePanne: "DEBIT_FAIBLE",
    priorite: "NORMALE",
    description:
      "Débit descendant autour de 8 Mb/s au lieu des 100 Mb/s de l'abonnement, surtout le soir.",
    creeeIlYaHeures: 9,
    etapes: [],
  });

  await creerIntervention({
    clientId: slim.id,
    typePanne: "ONT_DEFECTUEUX",
    priorite: "HAUTE",
    description:
      "L'ONT redémarre tout seul plusieurs fois par heure et chauffe anormalement.",
    creeeIlYaHeures: 20,
    etapes: [],
  });

  // Zone de Sousse : aucun technicien ne la couvre, donc personne ne voit
  // cette panne. C'est exactement ce que le tableau de bord du superviseur
  // doit signaler — une zone decouverte n'est pas une zone vide.
  await creerIntervention({
    clientId: rania.id,
    typePanne: "CABLE_ENDOMMAGE",
    priorite: "HAUTE",
    description:
      "Le câble de branchement pend le long de la façade depuis la tempête de cette nuit.",
    creeeIlYaHeures: 14,
    etapes: [],
  });

  // --- 2 interventions ASSIGNEE
  await creerIntervention({
    clientId: ines.id,
    technicienId: karim.id,
    typePanne: "CABLE_ENDOMMAGE",
    priorite: "HAUTE",
    description:
      "Câble sectionné au niveau du portail après le passage d'une entreprise de travaux.",
    creeeIlYaHeures: 30,
    etapes: [
      {
        action: "ACCEPTATION",
        vers: "ASSIGNEE",
        ilYaHeures: 27,
        parLeTechnicien: true,
        commentaire: "Intervention acceptée par le technicien",
      },
    ],
  });

  await creerIntervention({
    clientId: hatem.id,
    technicienId: amine.id,
    superviseurId: superviseur.id,
    typePanne: "NOUVELLE_INSTALLATION",
    priorite: "BASSE",
    description:
      "Demande de raccordement fibre pour un nouveau logement, gaine déjà en place.",
    creeeIlYaHeures: 48,
    etapes: [
      {
        action: "ASSIGNATION_SUPERVISEUR",
        vers: "ASSIGNEE",
        ilYaHeures: 44,
        commentaire: "Assignée manuellement par le superviseur",
      },
    ],
  });

  // --- 2 interventions EN_COURS
  // Nadia est a Tunis : c'est Yosr, l'autre technicien de la zone, qui a pris
  // celle-ci pendant que Karim traitait le cable d'Ines.
  await creerIntervention({
    clientId: nadia.id,
    technicienId: yosr.id,
    typePanne: "CHANGEMENT_ROUTEUR",
    priorite: "NORMALE",
    description:
      "Le routeur ne diffuse plus le Wi-Fi 5 GHz, remplacement du matériel demandé.",
    creeeIlYaHeures: 54,
    etapes: [
      {
        action: "ACCEPTATION",
        vers: "ASSIGNEE",
        ilYaHeures: 50,
        parLeTechnicien: true,
        commentaire: "Intervention acceptée par le technicien",
      },
      {
        action: "DEMARRAGE",
        vers: "EN_COURS",
        ilYaHeures: 4,
        parLeTechnicien: true,
        commentaire: "Technicien sur place",
      },
    ],
  });

  // Rania est a Sousse, zone que personne ne couvre : aucun technicien n'aurait
  // pu voir cette panne, donc aucun n'aurait pu l'accepter. C'est le
  // superviseur qui l'a confiee a Mehdi, hors de sa zone habituelle. Cas
  // volontaire : il montre a quoi sert l'affectation manuelle.
  await creerIntervention({
    clientId: rania.id,
    technicienId: mehdi.id,
    superviseurId: superviseur.id,
    typePanne: "DEBIT_FAIBLE",
    priorite: "HAUTE",
    description:
      "Coupures répétées et débit instable depuis l'orage de la semaine dernière.",
    creeeIlYaHeures: 72,
    etapes: [
      {
        action: "ASSIGNATION_SUPERVISEUR",
        vers: "ASSIGNEE",
        ilYaHeures: 70,
        commentaire:
          "Affectée par le superviseur à Mehdi Gharbi (FC-003) — hors de sa zone, aucun technicien ne couvre Sousse",
      },
      {
        action: "DEMARRAGE",
        vers: "EN_COURS",
        ilYaHeures: 6,
        parLeTechnicien: true,
        commentaire: "Mesure de la ligne en cours",
      },
    ],
  });

  // --- 2 interventions TERMINEE (une notée, une pas encore)
  // Youssef est a Ariana : c'est Sonia, technicienne de cette zone.
  await creerIntervention({
    clientId: youssef.id,
    technicienId: sonia.id,
    typePanne: "COUPURE_TOTALE",
    priorite: "URGENTE",
    description: "Coupure totale sur toute la ligne, aucun signal reçu.",
    creeeIlYaHeures: 120,
    rapport:
      "Connecteur SC/APC oxydé au niveau du PBO. Nettoyage puis remplacement de la jarretière. Débit mesuré à 98 Mb/s après intervention, ligne stable.",
    noteClient: 5,
    etapes: [
      {
        action: "ACCEPTATION",
        vers: "ASSIGNEE",
        ilYaHeures: 118,
        parLeTechnicien: true,
        commentaire: "Intervention acceptée par le technicien",
      },
      {
        action: "DEMARRAGE",
        vers: "EN_COURS",
        ilYaHeures: 100,
        parLeTechnicien: true,
        commentaire: "Technicien sur place",
      },
      {
        action: "CLOTURE",
        vers: "TERMINEE",
        ilYaHeures: 97,
        parLeTechnicien: true,
        commentaire: "Rapport enregistré, ligne rétablie",
      },
    ],
  });

  await creerIntervention({
    clientId: slim.id,
    technicienId: mehdi.id,
    typePanne: "AUTRE",
    priorite: "BASSE",
    description:
      "Prise optique murale descellée, à refixer proprement dans le salon.",
    creeeIlYaHeures: 96,
    rapport:
      "Prise optique refixée sur platine murale et fibre reprise en attente. Aucun impact sur le signal, contrôle du débit effectué avec le client.",
    etapes: [
      {
        action: "ACCEPTATION",
        vers: "ASSIGNEE",
        ilYaHeures: 92,
        parLeTechnicien: true,
        commentaire: "Intervention acceptée par le technicien",
      },
      {
        action: "DEMARRAGE",
        vers: "EN_COURS",
        ilYaHeures: 76,
        parLeTechnicien: true,
        commentaire: "Technicien sur place",
      },
      {
        action: "CLOTURE",
        vers: "TERMINEE",
        ilYaHeures: 74,
        parLeTechnicien: true,
        commentaire: "Rapport enregistré",
      },
    ],
  });

  // --- 1 intervention ANNULEE
  await creerIntervention({
    clientId: ines.id,
    typePanne: "DEBIT_FAIBLE",
    priorite: "NORMALE",
    description:
      "Lenteurs sur le Wi-Fi. Le client a résolu le problème lui-même en repositionnant sa box.",
    creeeIlYaHeures: 140,
    etapes: [
      {
        action: "ANNULATION",
        vers: "ANNULEE",
        ilYaHeures: 136,
        commentaire: "Annulée par le client : problème résolu sans intervention",
      },
    ],
  });

  /* ---------------------------------------------------------------------- */
  /* Historique des 6 derniers mois                                         */
  /* ---------------------------------------------------------------------- */

  /**
   * Les 10 interventions ci-dessus couvrent tous les statuts et servent à la
   * démonstration « à chaud ». Elles ne suffisent pas à donner du relief aux
   * graphiques du superviseur, qui portent sur 6 mois : on ajoute ici un
   * historique d'interventions closes, réparti sur cette période.
   *
   * Le tirage est déterministe (générateur à graine fixe) : deux exécutions du
   * seed produisent exactement le même jeu de données.
   */
  console.log("Création de l'historique des 6 derniers mois...");

  let graine = 20260803;
  const alea = () => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648;
  };
  const parmi = <T,>(liste: readonly T[]) => liste[Math.floor(alea() * liste.length)];

  // Un abonné n'est traité que par un technicien de sa zone. Rania (Sousse)
  // n'apparaît pas ici : sa zone n'a aucun technicien, donc aucune de ses
  // pannes n'a jamais pu être prise en charge spontanément.
  const equipes = [
    { clients: [nadia, ines], techniciens: [karim, yosr] }, // Tunis
    { clients: [youssef], techniciens: [sonia] }, // Ariana
    { clients: [slim], techniciens: [mehdi] }, // Ben Arous
    { clients: [hatem], techniciens: [amine] }, // Sfax
  ];

  const CATALOGUE: Record<
    TypePanne,
    { description: string; rapport: string }[]
  > = {
    COUPURE_TOTALE: [
      {
        description:
          "Aucune connexion depuis le début de matinée, le voyant PON reste éteint sur la box.",
        rapport:
          "Fibre sectionnée dans la colonne montante de l'immeuble. Reprise par épissure de fusion, perte mesurée à 0,04 dB. Ligne rétablie et contrôlée avec l'abonné.",
      },
      {
        description:
          "Plus d'internet ni de téléphone fixe depuis hier soir, après une coupure de courant dans le quartier.",
        rapport:
          "Alimentation de l'ONT défaillante après la surtension. Remplacement du bloc secteur et redémarrage complet. Débit rétabli à 96 Mb/s.",
      },
    ],
    DEBIT_FAIBLE: [
      {
        description:
          "Le débit plafonne à 12 Mb/s alors que l'abonnement est à 100 Mb/s, surtout en soirée.",
        rapport:
          "Jarretière optique pincée derrière le meuble, atténuation de 3,1 dB. Remplacement de la jarretière et repositionnement de l'ONT. Débit remonté à 94 Mb/s.",
      },
      {
        description:
          "Connexion très lente et instable sur tous les appareils, y compris en filaire.",
        rapport:
          "Connecteur SC/APC encrassé au niveau du PBO. Nettoyage à sec puis contrôle au réflectomètre : signal conforme sur toute la liaison.",
      },
    ],
    ONT_DEFECTUEUX: [
      {
        description:
          "L'ONT redémarre plusieurs fois par jour et le voyant d'alarme reste allumé en rouge.",
        rapport:
          "ONT en défaut matériel, module optique hors tolérance. Remplacement de l'équipement et réenregistrement de la ligne auprès de l'OLT.",
      },
    ],
    CABLE_ENDOMMAGE: [
      {
        description:
          "Le câble qui longe la façade a été arraché lors de travaux de ravalement.",
        rapport:
          "Reprise du câble de branchement sur 18 mètres et repose sur nouvelles attaches. Épissure de raccordement au PBO, liaison contrôlée conforme.",
      },
    ],
    NOUVELLE_INSTALLATION: [
      {
        description:
          "Demande de raccordement pour un logement neuf, la gaine est déjà tirée jusqu'au palier.",
        rapport:
          "Tirage de la fibre du PBO palier jusqu'à la prise optique du salon, pose de la PTO et de l'ONT. Mise en service et configuration du routeur avec l'abonné.",
      },
    ],
    CHANGEMENT_ROUTEUR: [
      {
        description:
          "Le Wi-Fi ne porte plus au-delà d'une pièce et la bande 5 GHz a disparu.",
        rapport:
          "Routeur remplacé par un modèle récent, canaux Wi-Fi réattribués après analyse du voisinage. Couverture vérifiée dans chaque pièce.",
      },
    ],
    AUTRE: [
      {
        description:
          "La prise optique murale s'est descellée et la fibre est tendue, je crains de l'abîmer.",
        rapport:
          "Prise optique refixée sur platine et fibre reprise en attente avec un rayon de courbure conforme. Aucun impact mesuré sur le signal.",
      },
    ],
  };

  const TYPES: TypePanne[] = [
    "COUPURE_TOTALE",
    "DEBIT_FAIBLE",
    "ONT_DEFECTUEUX",
    "CABLE_ENDOMMAGE",
    "NOUVELLE_INSTALLATION",
    "CHANGEMENT_ROUTEUR",
    "AUTRE",
  ];
  const PRIORITES_TIRAGE: Priorite[] = [
    "BASSE",
    "NORMALE",
    "NORMALE",
    "NORMALE",
    "HAUTE",
    "URGENTE",
  ];

  const H_JOUR = 24;
  // Mois 1 à 6 en arrière, avec un volume qui progresse vers le présent.
  const VOLUME_PAR_MOIS = [3, 4, 3, 5, 4, 3];

  for (const [index, volume] of VOLUME_PAR_MOIS.entries()) {
    const moisEnArriere = VOLUME_PAR_MOIS.length - index; // 6 → 1
    for (let n = 0; n < volume; n++) {
      const equipe = parmi(equipes);
      const client = parmi(equipe.clients);
      const technicien = parmi(equipe.techniciens);
      const type = parmi(TYPES);
      const modele = parmi(CATALOGUE[type]);

      // Date de déclaration quelque part dans le mois considéré.
      const creation =
        moisEnArriere * 30 * H_JOUR - Math.floor(alea() * 28) * H_JOUR;
      const acceptation = creation - (2 + Math.floor(alea() * 20));
      const demarrage = acceptation - (4 + Math.floor(alea() * 40));
      const cloture = demarrage - (1 + Math.floor(alea() * 6));

      // Une intervention sur sept est annulée avant toute prise en charge.
      const annulee = alea() < 0.14;

      if (annulee) {
        await creerIntervention({
          clientId: client.id,
          typePanne: type,
          priorite: parmi(PRIORITES_TIRAGE),
          description: modele.description,
          creeeIlYaHeures: creation,
          etapes: [
            {
              action: "ANNULATION",
              vers: "ANNULEE",
              ilYaHeures: acceptation,
              commentaire:
                "Annulée par le client : problème résolu sans intervention",
            },
          ],
        });
        continue;
      }

      // Trois interventions sur quatre reçoivent une note de l'abonné.
      const notee = alea() < 0.75;

      await creerIntervention({
        clientId: client.id,
        technicienId: technicien.id,
        typePanne: type,
        priorite: parmi(PRIORITES_TIRAGE),
        description: modele.description,
        rapport: modele.rapport,
        noteClient: notee ? (alea() < 0.7 ? 5 : 4) : undefined,
        creeeIlYaHeures: creation,
        etapes: [
          {
            action: "ACCEPTATION",
            vers: "ASSIGNEE",
            ilYaHeures: acceptation,
            parLeTechnicien: true,
            commentaire: "Intervention acceptée par le technicien",
          },
          {
            action: "DEMARRAGE",
            vers: "EN_COURS",
            ilYaHeures: demarrage,
            parLeTechnicien: true,
            commentaire: "Technicien sur place",
          },
          {
            action: "CLOTURE",
            vers: "TERMINEE",
            ilYaHeures: cloture,
            parLeTechnicien: true,
            commentaire: "Rapport enregistré, ligne rétablie",
          },
        ],
      });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Factures, règlements et remises d'espèces                              */
  /* ---------------------------------------------------------------------- */

  /**
   * Invoicing happens in a second pass, over closed interventions sorted by
   * closing date.
   *
   * Doing it inside `creerIntervention` would number the invoices in the order
   * the script happens to create them — the ten demo cases first, then six
   * months of history — so `FC-2026-0001` would be dated after `FC-2026-0030`.
   * A ledger whose numbers run backwards through time is the first thing an
   * accountant notices, and the last thing they trust.
   */
  console.log("Émission des factures et des règlements...");

  const terminees = await prisma.intervention.findMany({
    where: { statut: "TERMINEE" },
    orderBy: { dateFin: "asc" },
    select: { id: true, typePanne: true, dateFin: true, technicienId: true },
  });

  const compteurs = new Map<number, number>();
  function numeroSuivant(prefixe: string, date: Date) {
    const annee = date.getFullYear();
    const rang = (compteurs.get(annee) ?? 0) + 1;
    if (prefixe === "FC") compteurs.set(annee, rang);
    return `${prefixe}-${annee}-${String(rang).padStart(4, "0")}`;
  }

  const PIECES = [
    { designation: "Jarretière optique SC/APC 3 m", montant: 18_000 },
    { designation: "Bloc d'alimentation ONT", montant: 45_000 },
    { designation: "Prise optique murale (PTO)", montant: 32_000 },
    { designation: "Routeur Wi-Fi 6 double bande", montant: 210_000 },
  ];

  const MOYENS_TIRAGE: MoyenPaiement[] = [
    "ESPECES",
    "ESPECES",
    "ESPECES",
    "CARTE",
    "CARTE",
    "VIREMENT",
    "D17",
  ];

  // Especes encaissees, regroupees par technicien pour construire les remises.
  const especesParTechnicien = new Map<
    string,
    { id: string; date: Date; montant: number }[]
  >();
  let compteurEspeces = 0;
  let compteurEnLigne = 0;
  // Le premier virement tire reste en attente : sans lui, l'ecran « virements
  // annonces » du superviseur se demontrerait vide, ce qui n'apprend rien.
  let virementEnAttenteFait = false;

  for (const [rang, intervention] of terminees.entries()) {
    const dateFin = intervention.dateFin ?? new Date();

    // Une intervention sur trois a demande une piece.
    const piece = alea() < 0.33 ? parmi(PIECES) : null;
    const lignes = [
      {
        designation: `Déplacement et main-d’œuvre — ${
          TYPE_PANNE_LABELS[intervention.typePanne as TypePanne] ?? "Intervention"
        }`,
        montant: tarifDe(intervention.typePanne),
      },
      ...(piece ? [piece] : []),
    ];
    const montantTotal = lignes.reduce((s, l) => s + l.montant, 0);

    // Les trois dernieres factures restent impayees : sans elles, la
    // demonstration n'aurait rien a payer ni rien a encaisser.
    const recente = rang >= terminees.length - 3;
    const moyen = recente ? null : parmi(MOYENS_TIRAGE);
    const enAttente = moyen === "VIREMENT" && !virementEnAttenteFait;
    if (enAttente) virementEnAttenteFait = true;
    const soldee = moyen !== null && !enAttente;

    // Regle en moyenne deux jours apres la cloture.
    const datePaiement = new Date(
      dateFin.getTime() + (12 + Math.floor(alea() * 60)) * 3600 * 1000,
    );

    const facture = await prisma.facture.create({
      data: {
        interventionId: intervention.id,
        numero: numeroSuivant("FC", dateFin),
        montantTotal,
        statut: soldee ? "PAYEE" : "A_PAYER",
        dateEmission: dateFin,
        datePaiement: soldee ? datePaiement : null,
        lignes: { create: lignes },
      },
    });

    if (!moyen) continue;

    const especes = moyen === "ESPECES";
    const reference = especes
      ? `ESP-${datePaiement.getFullYear()}-${String(++compteurEspeces).padStart(4, "0")}`
      : `PAY-${datePaiement.getFullYear()}-${String(++compteurEnLigne).padStart(4, "0")}`;

    const paiement = await prisma.paiement.create({
      data: {
        factureId: facture.id,
        montant: montantTotal,
        moyen,
        statut: enAttente ? "EN_ATTENTE" : "CONFIRME",
        reference,
        // Seules les especes passent par le technicien : c'est ce qui cree sa
        // dette envers la societe.
        technicienId: especes ? intervention.technicienId : null,
        dateCreation: datePaiement,
        dateConfirmation: enAttente ? null : datePaiement,
      },
    });

    if (especes && intervention.technicienId) {
      const liste = especesParTechnicien.get(intervention.technicienId) ?? [];
      liste.push({ id: paiement.id, date: datePaiement, montant: montantTotal });
      especesParTechnicien.set(intervention.technicienId, liste);
    }
  }

  /**
   * Remittances.
   *
   * Each technician remits everything except their most recent collection,
   * which stays in their pocket — that leftover is what makes "Ma caisse"
   * demonstrable, and what the supervisor sees under "espèces chez les
   * techniciens". One technician has already declared theirs, so the
   * "accuser réception" screen has something to act on instead of being shown
   * empty, which teaches nothing.
   */
  let versementEnAttenteFait = false;

  for (const [technicienId, paiements] of especesParTechnicien) {
    const parDateDecroissante = [...paiements].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
    const [dernier, ...anciens] = parDateDecroissante;

    if (anciens.length > 0) {
      const montant = anciens.reduce((s, p) => s + p.montant, 0);
      const dateRemise = new Date(anciens[0].date.getTime() + 24 * 3600 * 1000);
      const versement = await prisma.versement.create({
        data: {
          technicienId,
          montant,
          statut: "CONFIRME",
          commentaire: "Remise au bureau, fin de semaine",
          dateCreation: dateRemise,
          dateConfirmation: dateRemise,
          confirmePar: superviseur.id,
        },
      });
      await prisma.paiement.updateMany({
        where: { id: { in: anciens.map((p) => p.id) } },
        data: { versementId: versement.id },
      });
    }

    // Le dernier encaissement : declare mais pas encore accuse pour le premier
    // technicien, encore en poche pour les autres.
    if (!versementEnAttenteFait) {
      const versement = await prisma.versement.create({
        data: {
          technicienId,
          montant: dernier.montant,
          statut: "EN_ATTENTE",
          commentaire: "Déposée au bureau ce matin",
          dateCreation: ilYa(5),
        },
      });
      await prisma.paiement.update({
        where: { id: dernier.id },
        data: { versementId: versement.id },
      });
      versementEnAttenteFait = true;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Récapitulatif                                                          */
  /* ---------------------------------------------------------------------- */

  const comptes = [
    { role: "SUPERVISEUR", email: superviseur.email, detail: "Leila Ben Salah" },
    ...[karim, sonia, mehdi, amine, yosr].map((t) => ({
      role: "TECHNICIEN",
      email: t.utilisateur.email,
      detail: `${t.matricule} · zone ${t.zone}`,
    })),
    ...[nadia, youssef, ines, slim, rania, hatem].map((c) => ({
      role: "CLIENT",
      email: c.utilisateur.email,
      detail: `${c.numContrat} · ${c.ville} (zone ${c.zone})`,
    })),
  ];

  console.log("\n=======================================================");
  console.log("  Jeu de données créé");
  console.log("=======================================================");
  console.log(`  Opérateurs    : ${await prisma.operateur.count()}`);
  console.log(`  Utilisateurs  : ${await prisma.utilisateur.count()}`);
  console.log(`  Techniciens   : ${await prisma.technicien.count()}`);
  console.log(`  Clients       : ${await prisma.client.count()}`);
  console.log(`  Interventions : ${await prisma.intervention.count()}`);
  console.log(`  Historiques   : ${await prisma.historique.count()}`);
  console.log(`  Factures      : ${await prisma.facture.count()}`);
  console.log(`  Paiements     : ${await prisma.paiement.count()}`);
  console.log(`  Versements    : ${await prisma.versement.count()}`);
  console.log("\n  Identifiants de connexion");
  console.log(`  Mot de passe commun a tous les comptes : ${MOT_DE_PASSE_DEMO}\n`);
  console.table(comptes);
}

main()
  .catch((erreur) => {
    console.error("Le seed a échoué :", erreur);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
