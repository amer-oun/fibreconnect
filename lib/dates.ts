/**
 * Date formatting, French, no external dependency.
 *
 * The whole app displays dates as `dd/MM/yyyy HH:mm`. Timezone is forced to
 * Africa/Tunis so the server and the browser never disagree by an hour.
 */

const FUSEAU = "Africa/Tunis";

const formatJour = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: FUSEAU,
});

const formatComplet = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSEAU,
});

const formatMois = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "2-digit",
  timeZone: FUSEAU,
});

/** `04/08/2026 14:30` */
export function formaterDateHeure(date: Date | string | null | undefined) {
  if (!date) return "—";
  return formatComplet.format(new Date(date)).replace(",", "");
}

/** `04/08/2026` */
export function formaterDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return formatJour.format(new Date(date));
}

/** `août 26` — pour les axes de graphiques. */
export function formaterMois(date: Date | string) {
  return formatMois.format(new Date(date));
}

/**
 * « il y a 3 heures », « dans 2 jours ». Utilise l'API native du navigateur
 * et du serveur, donc pas de bibliotheque de dates.
 */
const formatRelatif = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formaterDelai(date: Date | string | null | undefined) {
  if (!date) return "—";
  const secondes = (new Date(date).getTime() - Date.now()) / 1000;
  const paliers: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unite, taille] of paliers) {
    if (Math.abs(secondes) >= taille) {
      return formatRelatif.format(Math.round(secondes / taille), unite);
    }
  }
  return "à l’instant";
}

/**
 * Duree entre deux dates, en heures et minutes : `3 h 45`.
 * Sert a afficher le temps de traitement d'une intervention.
 */
export function formaterDuree(
  debut: Date | string | null | undefined,
  fin: Date | string | null | undefined,
) {
  if (!debut || !fin) return "—";
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(fin).getTime() - new Date(debut).getTime()) / 60000,
    ),
  );
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures === 0) return `${reste} min`;
  if (heures >= 24) {
    const jours = Math.floor(heures / 24);
    return `${jours} j ${heures % 24} h`;
  }
  return `${heures} h ${String(reste).padStart(2, "0")}`;
}

/** Duree moyenne en heures, pour les statistiques. */
export function heuresEntre(debut: Date, fin: Date) {
  return (fin.getTime() - debut.getTime()) / 3600000;
}
