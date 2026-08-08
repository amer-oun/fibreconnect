import { prisma } from "@/lib/prisma";
import {
  delaiDe,
  libellePriorite,
  libelleTypePanne,
  type Role,
} from "@/lib/constants";
import { conditionHorsDelai } from "@/lib/filtres";
import { formaterMontant } from "@/lib/monnaie";
import { restesAPayer } from "@/lib/facturation";

/**
 * In-app alerts, derived from the data rather than stored.
 *
 * There is no `Notification` table: every alert is recomputed from the
 * interventions themselves. Nothing can therefore go stale or contradict the
 * database, and no extra migration is needed. The trade-off is that there is
 * no per-user "read" flag — the bell shows what currently needs attention,
 * not what has not been opened yet.
 */

export type Notification = {
  id: string;
  titre: string;
  detail: string;
  lien: string;
  date: Date;
  ton: "info" | "alerte";
};

const JOUR = 86_400_000;

export async function notificationsPour(utilisateur: {
  id: string;
  role: Role;
}): Promise<Notification[]> {
  switch (utilisateur.role) {
    case "CLIENT":
      return notificationsClient(utilisateur.id);
    case "TECHNICIEN":
      return notificationsTechnicien(utilisateur.id);
    case "SUPERVISEUR":
      return notificationsSuperviseur();
  }
}

/** Le client suit l'avancement de ses propres demandes. */
async function notificationsClient(utilisateurId: string) {
  const client = await prisma.client.findUnique({
    where: { utilisateurId },
    select: { id: true },
  });
  if (!client) return [];

  const [recentes, impayees] = await Promise.all([
    prisma.historique.findMany({
      where: {
        intervention: { clientId: client.id },
        dateAction: { gte: new Date(Date.now() - 7 * JOUR) },
        action: { not: "CREATION" },
      },
      orderBy: { dateAction: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        nouveauStatut: true,
        dateAction: true,
        intervention: { select: { id: true, typePanne: true } },
      },
    }),
    prisma.facture.findMany({
      where: { statut: "A_PAYER", intervention: { clientId: client.id } },
      orderBy: { dateEmission: "asc" },
      select: {
        id: true,
        numero: true,
        montantTotal: true,
        dateEmission: true,
        intervention: { select: { id: true, typePanne: true } },
      },
    }),
  ]);

  const soldes = await restesAPayer(prisma, impayees);

  const messages: Record<string, string> = {
    ACCEPTATION: "Un technicien a accepté votre demande",
    ASSIGNATION_SUPERVISEUR: "Un technicien a été assigné à votre demande",
    REASSIGNATION: "Votre demande a été confiée à un autre technicien",
    DEMARRAGE: "Le technicien est intervenu sur votre ligne",
    CLOTURE: "Votre intervention est terminée",
    ANNULATION: "Votre demande a été annulée",
  };

  return [
    // Une facture a regler passe avant l'avancement : c'est la seule ligne qui
    // demande un geste a l'abonne, tout le reste ne fait que l'informer.
    ...impayees.map((facture) => ({
      id: `facture-${facture.id}`,
      titre: `Facture ${facture.numero} à régler`,
      detail: `${libelleTypePanne(facture.intervention.typePanne)} · ${formaterMontant(
        soldes.get(facture.id) ?? facture.montantTotal,
      )}`,
      lien: `/client/suivi/${facture.intervention.id}`,
      date: facture.dateEmission,
      ton: "alerte" as const,
    })),
    ...recentes.map((ligne) => ({
      id: ligne.id,
      titre: messages[ligne.action] ?? "Votre demande a évolué",
      detail: libelleTypePanne(ligne.intervention.typePanne),
      lien: `/client/suivi/${ligne.intervention.id}`,
      date: ligne.dateAction,
      ton: "info" as const,
    })),
  ];
}

/**
 * Le technicien est alerte sur les pannes disponibles de sa zone
 * (la regle centrale du projet) et sur ses interventions non demarrees.
 */
async function notificationsTechnicien(utilisateurId: string) {
  const technicien = await prisma.technicien.findUnique({
    where: { utilisateurId },
    select: { id: true, zone: true },
  });
  if (!technicien) return [];

  const [disponibles, aDemarrer, aEncaisser, enMain] = await Promise.all([
    prisma.intervention.findMany({
      where: { statut: "NOUVELLE", client: { zone: technicien.zone } },
      orderBy: { dateCreation: "desc" },
      take: 6,
      select: {
        id: true,
        typePanne: true,
        priorite: true,
        dateCreation: true,
        client: { select: { ville: true } },
      },
    }),
    prisma.intervention.findMany({
      where: { technicienId: technicien.id, statut: "ASSIGNEE" },
      orderBy: { dateCreation: "asc" },
      take: 4,
      select: { id: true, typePanne: true, dateCreation: true },
    }),
    prisma.facture.findMany({
      where: { statut: "A_PAYER", intervention: { technicienId: technicien.id } },
      orderBy: { dateEmission: "asc" },
      take: 5,
      select: {
        id: true,
        numero: true,
        montantTotal: true,
        dateEmission: true,
        intervention: {
          select: { typePanne: true, client: { select: { ville: true } } },
        },
      },
    }),
    prisma.paiement.aggregate({
      where: {
        technicienId: technicien.id,
        moyen: "ESPECES",
        statut: "CONFIRME",
        versementId: null,
      },
      _sum: { montant: true },
      _max: { dateCreation: true },
    }),
  ]);

  const especes = enMain._sum.montant ?? 0;

  /*
   * Les alertes d'argent ne passent pas par le tri chronologique.
   *
   * Des especes de la societe dans la poche d'un salarie ne sont pas un
   * evenement, c'est un etat : plus il dure, plus il compte. Le trier par date
   * l'enfoncerait sous les pannes du jour, c'est-a-dire exactement au moment ou
   * il devient genant.
   */
  const argent = [
    ...(especes > 0
      ? [
          {
            id: "especes",
            titre: "Espèces à remettre à la société",
            detail: formaterMontant(especes),
            lien: "/technicien/caisse",
            date: enMain._max.dateCreation ?? new Date(),
            ton: "alerte" as const,
          },
        ]
      : []),
    ...aEncaisser.map((f) => ({
      id: `facture-${f.id}`,
      titre: "Facture non réglée sur une de vos interventions",
      detail: `${f.numero} · ${libelleTypePanne(f.intervention.typePanne)} · ${
        f.intervention.client.ville
      }`,
      lien: "/technicien/caisse",
      date: f.dateEmission,
      ton: "info" as const,
    })),
  ];

  const terrain = [
    ...disponibles.map((i) => ({
      id: `dispo-${i.id}`,
      titre: "Nouvelle panne disponible",
      detail: `${libelleTypePanne(i.typePanne)} · ${i.client.ville}`,
      lien: "/technicien/dashboard",
      date: i.dateCreation,
      ton: i.priorite === "URGENTE" ? ("alerte" as const) : ("info" as const),
    })),
    ...aDemarrer.map((i) => ({
      id: `demarrer-${i.id}`,
      titre: "Intervention acceptée, pas encore démarrée",
      detail: libelleTypePanne(i.typePanne),
      lien: "/technicien/mes-interventions",
      date: i.dateCreation,
      ton: "alerte" as const,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return [...argent, ...terrain];
}

/** Le superviseur voit ce qui stagne, ce qui manque et ce qui attend. */
async function notificationsSuperviseur() {
  const [
    enAttente,
    indisponibles,
    aValider,
    zonesCouvertes,
    zonesAbonnes,
    remises,
    virements,
  ] = await Promise.all([
      // Hors du delai promis pour leur priorite, pas « depuis plus de 24 h » :
      // une coupure totale urgente et un changement de routeur peuvent avoir le
      // meme age sans que l'un et l'autre appellent le meme geste.
      prisma.intervention.findMany({
        where: conditionHorsDelai(),
        orderBy: { dateCreation: "asc" },
        take: 8,
        select: {
          id: true,
          typePanne: true,
          priorite: true,
          dateCreation: true,
          client: { select: { ville: true, zone: true } },
        },
      }),
      prisma.technicien.findMany({
        where: {
          utilisateur: { statutCompte: { in: ["ACTIF", "DESACTIVE"] } },
          OR: [{ disponible: false }, { utilisateur: { statutCompte: "DESACTIVE" } }],
        },
        take: 5,
        select: {
          id: true,
          matricule: true,
          disponible: true,
          utilisateur: { select: { nom: true, prenom: true, statutCompte: true } },
        },
      }),
      // Techniciens inscrits par eux-memes, en attente de validation.
      prisma.technicien.findMany({
        where: { utilisateur: { statutCompte: "EN_ATTENTE" } },
        take: 8,
        select: {
          id: true,
          zone: true,
          specialite: true,
          utilisateur: { select: { nom: true, prenom: true, creeLe: true } },
        },
      }),
      // Zones reellement couvertes par un technicien en activite.
      prisma.technicien.findMany({
        where: { utilisateur: { statutCompte: "ACTIF" } },
        select: { zone: true },
        distinct: ["zone"],
      }),
      // Zones ou vit au moins un abonne.
      prisma.client.findMany({ select: { zone: true }, distinct: ["zone"] }),
      // Remises d'especes declarees, en attente d'accuse de reception.
      prisma.versement.findMany({
        where: { statut: "EN_ATTENTE" },
        orderBy: { dateCreation: "asc" },
        take: 6,
        select: {
          id: true,
          montant: true,
          dateCreation: true,
          technicien: {
            select: {
              matricule: true,
              utilisateur: { select: { nom: true, prenom: true } },
            },
          },
        },
      }),
      // Virements annonces, a pointer sur le releve bancaire.
      prisma.paiement.findMany({
        where: { statut: "EN_ATTENTE", moyen: "VIREMENT" },
        orderBy: { dateCreation: "asc" },
        take: 6,
        select: {
          id: true,
          reference: true,
          montant: true,
          dateCreation: true,
          facture: { select: { numero: true } },
        },
      }),
    ]);

  const couvertes = new Set(zonesCouvertes.map((t) => t.zone));
  const decouvertes = zonesAbonnes
    .map((c) => c.zone)
    .filter((zone) => !couvertes.has(zone));

  return [
    // Une zone sans technicien est la panne la plus grave du systeme : les
    // pannes qui y tombent ne sont visibles par personne.
    ...decouvertes.map((zone) => ({
      id: `zone-${zone}`,
      titre: `Aucun technicien sur la zone ${zone}`,
      detail: "Les pannes de cette zone ne sont proposées à personne",
      lien: "/superviseur/techniciens",
      date: new Date(),
      ton: "alerte" as const,
    })),
    // Un mouvement d'argent qui attend une signature bloque deux comptabilites
    // a la fois : celle de la societe et celle du technicien.
    ...remises.map((v) => ({
      id: `remise-${v.id}`,
      titre: "Remise d’espèces à confirmer",
      detail: `${v.technicien.utilisateur.prenom} ${v.technicien.utilisateur.nom}${
        v.technicien.matricule ? ` · ${v.technicien.matricule}` : ""
      } · ${formaterMontant(v.montant)}`,
      lien: "/superviseur/finances",
      date: v.dateCreation,
      ton: "alerte" as const,
    })),
    ...virements.map((p) => ({
      id: `virement-${p.id}`,
      titre: "Virement annoncé, à pointer sur le relevé",
      detail: `${p.reference} · facture ${p.facture.numero} · ${formaterMontant(p.montant)}`,
      lien: "/superviseur/finances",
      date: p.dateCreation,
      ton: "info" as const,
    })),
    ...aValider.map((t) => ({
      id: `valider-${t.id}`,
      titre: "Inscription technicien à valider",
      detail: `${t.utilisateur.prenom} ${t.utilisateur.nom} · ${t.specialite} · zone ${t.zone}`,
      lien: `/superviseur/techniciens/${t.id}`,
      date: t.utilisateur.creeLe,
      ton: "alerte" as const,
    })),
    ...enAttente.map((i) => ({
      id: `attente-${i.id}`,
      titre: `Hors délai — ${libellePriorite(i.priorite).toLowerCase()}, ${delaiDe(
        i.priorite,
      )} h promises`,
      detail: `${libelleTypePanne(i.typePanne)} · zone ${i.client.zone} · ${i.client.ville}`,
      lien: "/superviseur/interventions?retard=1",
      date: i.dateCreation,
      ton: "alerte" as const,
    })),
    ...indisponibles.map((t) => ({
      id: `indispo-${t.id}`,
      titre:
        t.utilisateur.statutCompte === "DESACTIVE"
          ? "Compte technicien désactivé"
          : "Technicien indisponible",
      detail: `${t.utilisateur.prenom} ${t.utilisateur.nom}${t.matricule ? ` · ${t.matricule}` : ""}`,
      lien: `/superviseur/techniciens/${t.id}`,
      date: new Date(),
      ton: "info" as const,
    })),
  ];
}
