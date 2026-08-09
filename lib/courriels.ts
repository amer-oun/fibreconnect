import { prisma } from "@/lib/prisma";
import { libelleMoyenPaiement, libelleTypePanne } from "@/lib/constants";
import { formaterDate, formaterDateHeure } from "@/lib/dates";
import { formaterMontant } from "@/lib/monnaie";
import { resteAPayer } from "@/lib/facturation";
import { envoyer, lienVers, type Lettre } from "@/lib/courrier";
import { SOCIETE, raisonSociale } from "@/lib/societe";

/**
 * What the application says by e-mail, and when.
 *
 * Until now an intervention could be accepted, started, closed and invoiced
 * without the subscriber learning any of it unless they thought to log back
 * in. That is the wrong way round: the person waiting at home is the one who
 * should be told, not the one who should go and check.
 *
 * Two halves, deliberately separated:
 *
 *  - the `lettre…` functions are **pure**. They take plain values and return a
 *    composed letter, so the wording can be tested without a database, a mail
 *    server or a clock.
 *  - the `prevenir…` functions read what they need and hand the letter to the
 *    postman. They are called from `after()` — after the response is sent —
 *    and swallow their own failures. A mail server that is down must never
 *    turn a successful intervention into an error on screen.
 *
 * **There is no delivery log table.** A resent POST cannot produce a duplicate
 * message: every transition goes through `changerStatut`, which refuses a
 * second identical move, so the notification is never reached twice. The cost
 * of that choice is that a message lost by the mail server leaves no trace in
 * the database — only in the server log, and in `courrier/` when the file
 * transport is on.
 */

/** `#A1B2C3` — la même référence courte que sur la facture imprimée. */
function reference(interventionId: string) {
  return `#${interventionId.slice(-6).toUpperCase()}`;
}

const SIGNATURE = [
  "",
  "-- ",
  `${raisonSociale} — ${SOCIETE.telephone}`,
  `${SOCIETE.adresse}, ${SOCIETE.codePostal} ${SOCIETE.ville}`,
  "",
  "Message envoyé automatiquement par votre espace abonné.",
].join("\n");

/** Assemble le corps : les blocs vides disparaissent, la signature termine. */
function corps(...blocs: (string | null | undefined | false)[]) {
  return `${blocs.filter(Boolean).join("\n\n")}\n${SIGNATURE}\n`;
}

/* -------------------------------------------------------------------------- */
/* Les lettres : fonctions pures, testables sans base ni serveur              */
/* -------------------------------------------------------------------------- */

type Abonne = { courriel: string; prenom: string; nom: string };

type Technicien = {
  prenom: string;
  nom: string;
  matricule: string | null;
  telephone: string;
};

export function lettreAcceptation(donnees: {
  abonne: Abonne;
  interventionId: string;
  typePanne: string;
  dateCreation: Date;
  technicien: Technicien;
  /** Le superviseur a changé de technicien en cours de route. */
  reaffectation?: boolean;
}): Lettre {
  const { abonne, technicien } = donnees;

  return {
    a: abonne.courriel,
    nom: `${abonne.prenom} ${abonne.nom}`,
    sujet: donnees.reaffectation
      ? `Changement de technicien — ${reference(donnees.interventionId)}`
      : `Votre panne est prise en charge — ${reference(donnees.interventionId)}`,
    texte: corps(
      `Bonjour ${abonne.prenom},`,
      donnees.reaffectation
        ? `Votre demande « ${libelleTypePanne(donnees.typePanne)} », déclarée le ${formaterDateHeure(
            donnees.dateCreation,
          )}, est désormais confiée à un autre technicien.`
        : `Votre demande « ${libelleTypePanne(donnees.typePanne)} », déclarée le ${formaterDateHeure(
            donnees.dateCreation,
          )}, vient d’être prise en charge.`,
      [
        `Technicien : ${technicien.prenom} ${technicien.nom}${
          technicien.matricule ? ` (${technicien.matricule})` : ""
        }`,
        `Téléphone  : ${technicien.telephone}`,
      ].join("\n"),
      "Il vous contactera avant de se déplacer.",
      `Suivre l’intervention :\n${lienVers(`/client/suivi/${donnees.interventionId}`)}`,
    ),
  };
}

export function lettreDemarrage(donnees: {
  abonne: Abonne;
  interventionId: string;
  typePanne: string;
  technicien: Technicien;
}): Lettre {
  const { abonne, technicien } = donnees;

  return {
    a: abonne.courriel,
    nom: `${abonne.prenom} ${abonne.nom}`,
    sujet: `Le technicien intervient sur votre ligne — ${reference(donnees.interventionId)}`,
    texte: corps(
      `Bonjour ${abonne.prenom},`,
      `${technicien.prenom} ${technicien.nom} a démarré l’intervention sur votre ligne (${libelleTypePanne(
        donnees.typePanne,
      )}).`,
      "Vous recevrez la facture dès la fin des travaux.",
      `Suivre l’intervention :\n${lienVers(`/client/suivi/${donnees.interventionId}`)}`,
    ),
  };
}

export function lettreCloture(donnees: {
  abonne: Abonne;
  interventionId: string;
  typePanne: string;
  rapport: string | null;
  facture: {
    id: string;
    numero: string;
    montantHT: number;
    tauxTva: number;
    montantTva: number;
    timbreFiscal: number;
    montantTotal: number;
  };
  resteAPayer: number;
}): Lettre {
  const { abonne, facture } = donnees;

  // Les libellés sont alignés sur le plus long : dans un message en texte
  // brut, une colonne de montants qui ne tombe pas droit ne se lit plus.
  const lignes: [string, number][] = [
    ["Total hors taxes", facture.montantHT],
    [`TVA ${Math.round(facture.tauxTva * 100)} %`, facture.montantTva],
    ["Droit de timbre", facture.timbreFiscal],
    ["Total à payer", facture.montantTotal],
  ];
  const largeur = Math.max(...lignes.map(([libelle]) => libelle.length));

  const detail = [
    `Facture ${facture.numero}`,
    ...lignes.map(
      ([libelle, montant]) =>
        `  ${libelle.padEnd(largeur)} : ${formaterMontant(montant)}`,
    ),
  ].join("\n");

  return {
    a: abonne.courriel,
    nom: `${abonne.prenom} ${abonne.nom}`,
    sujet: `Intervention terminée — facture ${facture.numero}`,
    texte: corps(
      `Bonjour ${abonne.prenom},`,
      `Votre intervention « ${libelleTypePanne(donnees.typePanne)} » est terminée.`,
      donnees.rapport && `Rapport du technicien :\n${donnees.rapport}`,
      detail,
      donnees.resteAPayer === 0
        ? "Cette facture est déjà soldée : rien ne vous est demandé."
        : `Reste à régler : ${formaterMontant(donnees.resteAPayer)}`,
      [
        `Régler en ligne :\n${lienVers(`/client/suivi/${donnees.interventionId}`)}`,
        `Facture à imprimer :\n${lienVers(`/client/facture/${facture.id}`)}`,
      ].join("\n\n"),
    ),
  };
}

export function lettrePaiement(donnees: {
  abonne: Abonne;
  interventionId: string;
  factureId: string;
  numero: string;
  montant: number;
  moyen: string;
  detail: string | null;
  reference: string;
  date: Date;
  resteAPayer: number;
}): Lettre {
  const { abonne } = donnees;

  return {
    a: abonne.courriel,
    nom: `${abonne.prenom} ${abonne.nom}`,
    sujet: `Règlement enregistré — facture ${donnees.numero}`,
    texte: corps(
      `Bonjour ${abonne.prenom},`,
      "Nous avons bien enregistré votre règlement.",
      [
        `Facture   : ${donnees.numero}`,
        `Montant   : ${formaterMontant(donnees.montant)}`,
        `Moyen     : ${libelleMoyenPaiement(donnees.moyen)}${
          donnees.detail ? ` ${donnees.detail}` : ""
        }`,
        `Référence : ${donnees.reference}`,
        `Date      : ${formaterDateHeure(donnees.date)}`,
      ].join("\n"),
      donnees.resteAPayer === 0
        ? "Cette facture est soldée."
        : `Reste à régler : ${formaterMontant(donnees.resteAPayer)}`,
      `Consulter la facture :\n${lienVers(`/client/facture/${donnees.factureId}`)}`,
    ),
  };
}

export function lettreAnnulation(donnees: {
  abonne: Abonne;
  interventionId: string;
  typePanne: string;
  dateCreation: Date;
  motif: string | null;
}): Lettre {
  const { abonne } = donnees;

  return {
    a: abonne.courriel,
    nom: `${abonne.prenom} ${abonne.nom}`,
    sujet: `Votre demande a été annulée — ${reference(donnees.interventionId)}`,
    texte: corps(
      `Bonjour ${abonne.prenom},`,
      `Votre demande « ${libelleTypePanne(donnees.typePanne)} », déclarée le ${formaterDate(
        donnees.dateCreation,
      )}, a été annulée par nos services.`,
      donnees.motif && `Motif : ${donnees.motif}`,
      `Si la panne persiste, déclarez-la de nouveau :\n${lienVers("/client/nouvelle-panne")}`,
    ),
  };
}

export function lettreTechnicienValide(donnees: {
  courriel: string;
  prenom: string;
  nom: string;
  matricule: string;
  zone: string;
}): Lettre {
  return {
    a: donnees.courriel,
    nom: `${donnees.prenom} ${donnees.nom}`,
    sujet: `Votre compte technicien ${SOCIETE.nom} est activé`,
    texte: corps(
      `Bonjour ${donnees.prenom},`,
      "Votre inscription a été validée par le superviseur : vous pouvez désormais vous connecter.",
      [
        `Matricule : ${donnees.matricule}`,
        `Secteur   : ${donnees.zone}`,
      ].join("\n"),
      "Vous voyez les pannes déclarées dans votre secteur, et vous seul décidez " +
        "de les accepter. Le secteur est attribué par le superviseur : il n’est " +
        "pas modifiable depuis votre profil.",
      `Se connecter :\n${lienVers("/login")}`,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Les envois : lecture en base, puis remise au facteur                       */
/* -------------------------------------------------------------------------- */

/**
 * Exécute la composition et l'envoi sans jamais laisser échapper d'erreur.
 *
 * Appelé depuis `after()` : la réponse HTTP est déjà partie, il n'y a plus de
 * requête à faire échouer — mais une exception non rattrapée dans un travail
 * de fond arrête le processus Node.
 */
async function poster(quoi: string, travail: () => Promise<Lettre | null>) {
  try {
    const lettre = await travail();
    if (lettre) await envoyer(lettre);
  } catch (erreur) {
    console.error(`Courriel « ${quoi} » non composé :`, erreur);
  }
}

/** Ce qu'il faut savoir de l'abonné et de la panne, pour tous les messages. */
const selectionAvis = {
  id: true,
  typePanne: true,
  dateCreation: true,
  rapport: true,
  client: {
    select: {
      utilisateur: { select: { email: true, nom: true, prenom: true } },
    },
  },
  technicien: {
    select: {
      matricule: true,
      utilisateur: { select: { nom: true, prenom: true, telephone: true } },
    },
  },
} as const;

function abonneDe(intervention: {
  client: { utilisateur: { email: string; nom: string; prenom: string } };
}): Abonne {
  const u = intervention.client.utilisateur;
  return { courriel: u.email, prenom: u.prenom, nom: u.nom };
}

function technicienDe(intervention: {
  technicien: {
    matricule: string | null;
    utilisateur: { nom: string; prenom: string; telephone: string };
  } | null;
}): Technicien | null {
  if (!intervention.technicien) return null;
  const { matricule, utilisateur } = intervention.technicien;
  return {
    matricule,
    prenom: utilisateur.prenom,
    nom: utilisateur.nom,
    telephone: utilisateur.telephone,
  };
}

/** Un technicien a accepté, ou le superviseur a affecté ou réaffecté. */
export function prevenirAcceptation(
  interventionId: string,
  options?: { reaffectation?: boolean },
) {
  return poster("acceptation", async () => {
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      select: selectionAvis,
    });
    const technicien = intervention && technicienDe(intervention);
    if (!intervention || !technicien) return null;

    return lettreAcceptation({
      abonne: abonneDe(intervention),
      interventionId,
      typePanne: intervention.typePanne,
      dateCreation: intervention.dateCreation,
      technicien,
      reaffectation: options?.reaffectation,
    });
  });
}

/** Le technicien est sur place. */
export function prevenirDemarrage(interventionId: string) {
  return poster("démarrage", async () => {
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      select: selectionAvis,
    });
    const technicien = intervention && technicienDe(intervention);
    if (!intervention || !technicien) return null;

    return lettreDemarrage({
      abonne: abonneDe(intervention),
      interventionId,
      typePanne: intervention.typePanne,
      technicien,
    });
  });
}

/** Travaux terminés : le rapport et la facture partent ensemble. */
export function prevenirCloture(interventionId: string) {
  return poster("clôture", async () => {
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      select: {
        ...selectionAvis,
        facture: {
          select: {
            id: true,
            numero: true,
            montantHT: true,
            tauxTva: true,
            montantTva: true,
            timbreFiscal: true,
            montantTotal: true,
          },
        },
      },
    });
    if (!intervention?.facture) return null;

    return lettreCloture({
      abonne: abonneDe(intervention),
      interventionId,
      typePanne: intervention.typePanne,
      rapport: intervention.rapport,
      facture: intervention.facture,
      resteAPayer: await resteAPayer(prisma, intervention.facture.id),
    });
  });
}

/** Un règlement vient d'être confirmé : l'abonné reçoit son reçu. */
export function prevenirPaiement(referencePaiement: string) {
  return poster("règlement", async () => {
    const paiement = await prisma.paiement.findUnique({
      where: { reference: referencePaiement },
      select: {
        montant: true,
        moyen: true,
        detail: true,
        reference: true,
        dateConfirmation: true,
        dateCreation: true,
        facture: {
          select: {
            id: true,
            numero: true,
            intervention: { select: { id: true, client: selectionAvis.client } },
          },
        },
      },
    });
    if (!paiement) return null;

    return lettrePaiement({
      abonne: abonneDe(paiement.facture.intervention),
      interventionId: paiement.facture.intervention.id,
      factureId: paiement.facture.id,
      numero: paiement.facture.numero,
      montant: paiement.montant,
      moyen: paiement.moyen,
      detail: paiement.detail,
      reference: paiement.reference,
      date: paiement.dateConfirmation ?? paiement.dateCreation,
      resteAPayer: await resteAPayer(prisma, paiement.facture.id),
    });
  });
}

/**
 * La société annule une demande.
 *
 * Rien n'est envoyé quand c'est l'abonné qui renonce : il vient de cliquer sur
 * le bouton, lui écrire pour le lui apprendre serait absurde.
 */
export function prevenirAnnulationParLaSociete(
  interventionId: string,
  motif: string | null,
) {
  return poster("annulation", async () => {
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      select: selectionAvis,
    });
    if (!intervention) return null;

    return lettreAnnulation({
      abonne: abonneDe(intervention),
      interventionId,
      typePanne: intervention.typePanne,
      dateCreation: intervention.dateCreation,
      motif,
    });
  });
}

/**
 * Le superviseur active un compte technicien.
 *
 * Sans ce message, un candidat n'avait aucun moyen d'apprendre qu'il était
 * accepté : son compte refusait la connexion la veille et l'acceptait le
 * lendemain, sans que rien ne le lui dise.
 */
export function prevenirTechnicienValide(technicienId: string) {
  return poster("validation d’un technicien", async () => {
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId },
      select: {
        matricule: true,
        zone: true,
        utilisateur: { select: { email: true, nom: true, prenom: true } },
      },
    });
    if (!technicien?.matricule) return null;

    return lettreTechnicienValide({
      courriel: technicien.utilisateur.email,
      prenom: technicien.utilisateur.prenom,
      nom: technicien.utilisateur.nom,
      matricule: technicien.matricule,
      zone: technicien.zone,
    });
  });
}
