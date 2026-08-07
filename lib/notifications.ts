import { prisma } from "@/lib/prisma";
import { libelleTypePanne, type Role } from "@/lib/constants";

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

  const recentes = await prisma.historique.findMany({
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
  });

  const messages: Record<string, string> = {
    ACCEPTATION: "Un technicien a accepté votre demande",
    ASSIGNATION_SUPERVISEUR: "Un technicien a été assigné à votre demande",
    REASSIGNATION: "Votre demande a été confiée à un autre technicien",
    DEMARRAGE: "Le technicien est intervenu sur votre ligne",
    CLOTURE: "Votre intervention est terminée",
    ANNULATION: "Votre demande a été annulée",
  };

  return recentes.map((ligne) => ({
    id: ligne.id,
    titre: messages[ligne.action] ?? "Votre demande a évolué",
    detail: libelleTypePanne(ligne.intervention.typePanne),
    lien: `/client/suivi/${ligne.intervention.id}`,
    date: ligne.dateAction,
    ton: "info" as const,
  }));
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

  const [disponibles, aDemarrer] = await Promise.all([
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
  ]);

  return [
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
}

/** Le superviseur voit ce qui stagne, ce qui manque et ce qui attend. */
async function notificationsSuperviseur() {
  const [enAttente, indisponibles, aValider, zonesCouvertes, zonesAbonnes] =
    await Promise.all([
      prisma.intervention.findMany({
        where: {
          statut: "NOUVELLE",
          dateCreation: { lte: new Date(Date.now() - JOUR) },
        },
        orderBy: { dateCreation: "asc" },
        take: 8,
        select: {
          id: true,
          typePanne: true,
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
      titre: "Panne sans technicien depuis plus de 24 h",
      detail: `${libelleTypePanne(i.typePanne)} · zone ${i.client.zone} · ${i.client.ville}`,
      lien: "/superviseur/interventions",
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
