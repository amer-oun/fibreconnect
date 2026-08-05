import { prisma } from "@/lib/prisma";
import { STATUTS, TYPE_PANNE_LABELS, type Statut } from "@/lib/constants";
import { heuresEntre } from "@/lib/dates";

/**
 * Everything the supervisor dashboard shows, computed in one place.
 *
 * Charts receive numbers already shaped for them — no computation happens in a
 * client component, so the browser only draws.
 */

const MOIS_COURTS = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

/** Fenêtres proposées au-dessus des graphiques. */
export const FENETRES = [3, 6, 12] as const;
export type Fenetre = (typeof FENETRES)[number];

export function lireFenetre(valeur: unknown): Fenetre {
  const nombre = Number(valeur);
  return (FENETRES as readonly number[]).includes(nombre)
    ? (nombre as Fenetre)
    : 6;
}

export async function statistiquesSuperviseur(fenetre: Fenetre = 6) {
  const [
    parStatut,
    parType,
    interventions,
    techniciens,
    operateurs,
    nombreClients,
  ] = await Promise.all([
    prisma.intervention.groupBy({ by: ["statut"], _count: true }),
    prisma.intervention.groupBy({ by: ["typePanne"], _count: true }),
    prisma.intervention.findMany({
      select: {
        dateCreation: true,
        dateDebut: true,
        dateFin: true,
        statut: true,
        noteClient: true,
        technicienId: true,
        client: { select: { operateurId: true } },
        historiques: {
          where: { nouveauStatut: "ASSIGNEE" },
          orderBy: { dateAction: "asc" },
          take: 1,
          select: { dateAction: true },
        },
      },
    }),
    prisma.technicien.findMany({
      select: {
        id: true,
        matricule: true,
        zone: true,
        disponible: true,
        operateur: { select: { nom: true } },
        utilisateur: { select: { nom: true, prenom: true, actif: true } },
        interventions: { select: { statut: true, noteClient: true } },
      },
    }),
    prisma.operateur.findMany({
      select: { id: true, nom: true, _count: { select: { clients: true, techniciens: true } } },
    }),
    prisma.client.count(),
  ]);

  const total = interventions.length;
  const compteStatut = Object.fromEntries(
    parStatut.map((s) => [s.statut, s._count]),
  ) as Record<string, number>;

  /* Delai de prise en charge : creation → premiere assignation. */
  const delais = interventions
    .filter((i) => i.historiques.length > 0)
    .map((i) => heuresEntre(i.dateCreation, i.historiques[0].dateAction));
  const delaiMoyen =
    delais.length > 0 ? delais.reduce((a, b) => a + b, 0) / delais.length : null;

  /* Duree de traitement : demarrage → cloture. */
  const durees = interventions
    .filter((i) => i.dateDebut && i.dateFin)
    .map((i) => heuresEntre(i.dateDebut!, i.dateFin!));
  const dureeMoyenne =
    durees.length > 0 ? durees.reduce((a, b) => a + b, 0) / durees.length : null;

  const notes = interventions
    .map((i) => i.noteClient)
    .filter((n): n is number => n !== null);
  const noteMoyenne =
    notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;

  const terminees = compteStatut.TERMINEE ?? 0;
  const tauxResolution = total > 0 ? (terminees / total) * 100 : 0;

  /* Volume mensuel sur la fenetre choisie : declarees vs terminees. */
  const maintenant = new Date();
  const mois: { mois: string; declarees: number; terminees: number }[] = [];
  for (let recul = fenetre - 1; recul >= 0; recul--) {
    const debut = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth() - recul,
      1,
    );
    const fin = new Date(debut.getFullYear(), debut.getMonth() + 1, 1);

    // Sur 12 mois, deux « janv. » se suivraient sans l'annee.
    const etiquette =
      fenetre >= 12
        ? `${MOIS_COURTS[debut.getMonth()]} ${String(debut.getFullYear()).slice(2)}`
        : MOIS_COURTS[debut.getMonth()];

    mois.push({
      mois: etiquette,
      declarees: interventions.filter(
        (i) => i.dateCreation >= debut && i.dateCreation < fin,
      ).length,
      terminees: interventions.filter(
        (i) => i.dateFin && i.dateFin >= debut && i.dateFin < fin,
      ).length,
    });
  }

  /* Charge par technicien, decomposee par statut. */
  const chargeTechniciens = techniciens
    .map((t) => {
      const compte = (statut: Statut) =>
        t.interventions.filter((i) => i.statut === statut).length;
      return {
        id: t.id,
        nom: `${t.utilisateur.prenom} ${t.utilisateur.nom.charAt(0)}.`,
        matricule: t.matricule,
        operateur: t.operateur.nom,
        zone: t.zone,
        actif: t.utilisateur.actif,
        disponible: t.disponible,
        ASSIGNEE: compte("ASSIGNEE"),
        EN_COURS: compte("EN_COURS"),
        TERMINEE: compte("TERMINEE"),
        ANNULEE: compte("ANNULEE"),
        total: t.interventions.length,
      };
    })
    .sort((a, b) => b.total - a.total);

  /* Repartition par operateur : clients, techniciens, interventions. */
  const repartitionOperateurs = operateurs.map((o) => ({
    id: o.id,
    nom: o.nom,
    clients: o._count.clients,
    techniciens: o._count.techniciens,
    interventions: interventions.filter((i) => i.client.operateurId === o.id)
      .length,
  }));

  return {
    total,
    nombreClients,
    nombreTechniciens: techniciens.length,
    techniciensActifs: techniciens.filter((t) => t.utilisateur.actif).length,
    enAttente: compteStatut.NOUVELLE ?? 0,
    enTraitement: (compteStatut.ASSIGNEE ?? 0) + (compteStatut.EN_COURS ?? 0),
    terminees,
    annulees: compteStatut.ANNULEE ?? 0,
    tauxResolution,
    delaiMoyen,
    dureeMoyenne,
    noteMoyenne,
    nombreNotes: notes.length,

    /* Series pretes a tracer */
    serieStatuts: STATUTS.map((statut) => ({
      statut,
      valeur: compteStatut[statut] ?? 0,
    })),
    serieTypes: parType
      .map((t) => ({
        type: TYPE_PANNE_LABELS[t.typePanne as keyof typeof TYPE_PANNE_LABELS] ?? t.typePanne,
        valeur: t._count,
      }))
      .sort((a, b) => b.valeur - a.valeur),
    serieMensuelle: mois,
    chargeTechniciens,
    repartitionOperateurs,
  };
}
