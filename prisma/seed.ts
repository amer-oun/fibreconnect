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
  type Priorite,
  type Statut,
  type TypePanne,
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

  console.log("Création des opérateurs...");
  const tunisieTelecom = await prisma.operateur.create({
    data: { nom: "Tunisie Telecom" },
  });
  const ooredoo = await prisma.operateur.create({ data: { nom: "Ooredoo" } });
  const orange = await prisma.operateur.create({ data: { nom: "Orange" } });

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

  console.log("Création des techniciens...");

  function creerTechnicien(donnees: {
    email: string;
    nom: string;
    prenom: string;
    telephone: string;
    operateurId: string;
    matricule: string;
    specialite: string;
    zone: string;
  }) {
    const { email, nom, prenom, telephone, operateurId, ...profil } = donnees;
    return prisma.technicien.create({
      data: {
        ...profil,
        // `connect` et non `operateurId` : Prisma refuse de mêler une clé
        // étrangère brute et un `create` imbriqué dans le même objet.
        operateur: { connect: { id: operateurId } },
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
    operateurId: tunisieTelecom.id,
    matricule: "TT-001",
    specialite: "Raccordement FTTH",
    zone: "Tunis",
  });

  const sonia = await creerTechnicien({
    email: "sonia.trabelsi@fibreconnect.tn",
    nom: "Trabelsi",
    prenom: "Sonia",
    telephone: "+216 98 333 444",
    operateurId: tunisieTelecom.id,
    matricule: "TT-002",
    specialite: "Soudure et mesure optique",
    zone: "Ariana",
  });

  const mehdi = await creerTechnicien({
    email: "mehdi.gharbi@fibreconnect.tn",
    nom: "Gharbi",
    prenom: "Mehdi",
    telephone: "+216 55 555 666",
    operateurId: ooredoo.id,
    matricule: "OO-101",
    specialite: "Équipements ONT et routeurs",
    zone: "Ben Arous",
  });

  const amine = await creerTechnicien({
    email: "amine.jlassi@fibreconnect.tn",
    nom: "Jlassi",
    prenom: "Amine",
    telephone: "+216 22 777 888",
    operateurId: orange.id,
    matricule: "OR-201",
    specialite: "Diagnostic réseau",
    zone: "Sfax",
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
  const nadia = await creerClient({
    email: "nadia.chaabane@example.tn",
    nom: "Chaabane",
    prenom: "Nadia",
    telephone: "+216 20 101 101",
    operateurId: tunisieTelecom.id,
    adresse: "12 avenue Habib Bourguiba",
    ville: "Tunis",
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
    numContrat: "OO-2024-0004",
    latitude: 36.7533,
    longitude: 10.2278,
  });

  const rania = await creerClient({
    email: "rania.abdallah@example.tn",
    nom: "Abdallah",
    prenom: "Rania",
    telephone: "+216 20 505 505",
    operateurId: ooredoo.id,
    adresse: "5 avenue Léopold Senghor",
    ville: "Sousse",
    numContrat: "OO-2024-0005",
    latitude: 35.8256,
    longitude: 10.6084,
  });

  const hatem = await creerClient({
    email: "hatem.zouari@example.tn",
    nom: "Zouari",
    prenom: "Hatem",
    telephone: "+216 20 606 606",
    operateurId: orange.id,
    adresse: "17 route de Gabès",
    ville: "Sfax",
    numContrat: "OR-2024-0006",
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

  // --- 3 interventions NOUVELLE (visibles par les techniciens du même opérateur)
  await creerIntervention({
    clientId: nadia.id,
    typePanne: "COUPURE_TOTALE",
    priorite: "URGENTE",
    description:
      "Plus aucune connexion depuis ce matin. Le voyant PON de la box clignote en rouge.",
    creeeIlYaHeures: 3,
    etapes: [],
  });

  // Une NOUVELLE par opérateur : chaque technicien a de quoi travailler, et le
  // filtre par opérateur se démontre en comparant les trois tableaux de bord.
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
  await creerIntervention({
    clientId: nadia.id,
    technicienId: sonia.id,
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

  await creerIntervention({
    clientId: rania.id,
    technicienId: mehdi.id,
    typePanne: "DEBIT_FAIBLE",
    priorite: "HAUTE",
    description:
      "Coupures répétées et débit instable depuis l'orage de la semaine dernière.",
    creeeIlYaHeures: 72,
    etapes: [
      {
        action: "ACCEPTATION",
        vers: "ASSIGNEE",
        ilYaHeures: 70,
        parLeTechnicien: true,
        commentaire: "Intervention acceptée par le technicien",
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
  await creerIntervention({
    clientId: youssef.id,
    technicienId: karim.id,
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
  /* Récapitulatif                                                          */
  /* ---------------------------------------------------------------------- */

  const comptes = [
    { role: "SUPERVISEUR", email: superviseur.email, detail: "Leila Ben Salah" },
    ...[karim, sonia, mehdi, amine].map((t) => ({
      role: "TECHNICIEN",
      email: t.utilisateur.email,
      detail: `${t.matricule} · ${t.zone}`,
    })),
    ...[nadia, youssef, ines, slim, rania, hatem].map((c) => ({
      role: "CLIENT",
      email: c.utilisateur.email,
      detail: `${c.numContrat} · ${c.ville}`,
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
