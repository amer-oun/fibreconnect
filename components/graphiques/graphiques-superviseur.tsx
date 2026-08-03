"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { STATUT_COULEURS, STATUT_LABELS, type Statut } from "@/lib/constants";

/**
 * Charts for the supervisor dashboard.
 *
 * Colour rules, in order of authority:
 *  - a status keeps its mandated colour everywhere (badges, tables, charts);
 *  - the two-series time chart uses #0891B2 / #16A34A, a pair validated for
 *    colour-vision deficiency, lightness and contrast;
 *  - nothing is identified by colour alone: every series is named in a legend
 *    and every bar carries its value as text.
 */

const CYAN = "#0891B2";
const VERT = "#16A34A";
const GRILLE = "#DBE2EC";
const ENCRE = "#64748B";

const axeCommun = {
  stroke: ENCRE,
  fontSize: 11,
  tickLine: false,
  style: { fontFamily: "var(--font-mono)" },
};

/** Infobulle unique, pour que tous les graphiques parlent la même langue. */
function Infobulle({
  active,
  payload,
  label,
  suffixe = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string | number;
  suffixe?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-net border border-trait bg-white px-3 py-2 text-xs">
      {label !== undefined && (
        <p className="mb-1 font-display font-semibold text-nuit">{label}</p>
      )}
      {payload
        .filter((entree) => (entree.value ?? 0) > 0)
        .map((entree, index) => (
          <p key={index} className="flex items-center gap-2 text-ardoise">
            <span
              aria-hidden
              className="size-2 shrink-0"
              style={{ backgroundColor: entree.color }}
            />
            <span>{entree.name}</span>
            <span className="ml-auto font-mono font-medium text-nuit">
              {entree.value}
              {suffixe}
            </span>
          </p>
        ))}
    </div>
  );
}

const legende = {
  wrapperStyle: {
    fontSize: 12,
    fontFamily: "var(--font-plex-sans)",
    color: ENCRE,
    paddingTop: 8,
  },
};

/* -------------------------------------------------------------------------- */
/* Volume mensuel : deux séries, même unité, un seul axe                      */
/* -------------------------------------------------------------------------- */

export function GraphiqueVolume({
  donnees,
}: {
  donnees: { mois: string; declarees: number; terminees: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={donnees} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRILLE} vertical={false} />
        <XAxis dataKey="mois" {...axeCommun} axisLine={{ stroke: GRILLE }} />
        <YAxis {...axeCommun} axisLine={false} allowDecimals={false} width={40} />
        <Tooltip content={<Infobulle />} cursor={{ stroke: GRILLE }} />
        <Legend {...legende} />
        <Line
          type="monotone"
          dataKey="declarees"
          name="Déclarées"
          stroke={CYAN}
          strokeWidth={2}
          dot={{ r: 3, fill: CYAN, strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="terminees"
          name="Terminées"
          stroke={VERT}
          strokeWidth={2}
          dot={{ r: 3, fill: VERT, strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Répartition par statut : barres horizontales, couleurs de statut           */
/* -------------------------------------------------------------------------- */

export function GraphiqueStatuts({
  donnees,
}: {
  donnees: { statut: string; valeur: number }[];
}) {
  const avecLibelle = donnees.map((d) => ({
    ...d,
    libelle: STATUT_LABELS[d.statut as Statut] ?? d.statut,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={avecLibelle}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 4, bottom: 0 }}
        barCategoryGap={6}
      >
        <CartesianGrid stroke={GRILLE} horizontal={false} />
        <XAxis type="number" {...axeCommun} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="libelle"
          {...axeCommun}
          axisLine={false}
          width={78}
          style={{ fontFamily: "var(--font-plex-sans)" }}
        />
        <Tooltip content={<Infobulle />} cursor={{ fill: "#F5F7FA" }} />
        <Bar dataKey="valeur" name="Interventions" radius={[0, 4, 4, 0]} label={{
          position: "right",
          fill: ENCRE,
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}>
          {avecLibelle.map((entree) => (
            <Cell
              key={entree.statut}
              fill={STATUT_COULEURS[entree.statut as Statut]?.hex ?? ENCRE}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Types de panne : une seule série, donc pas de légende                      */
/* -------------------------------------------------------------------------- */

export function GraphiqueTypes({
  donnees,
}: {
  donnees: { type: string; valeur: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, donnees.length * 34)}>
      <BarChart
        data={donnees}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 4, bottom: 0 }}
        barCategoryGap={6}
      >
        <CartesianGrid stroke={GRILLE} horizontal={false} />
        <XAxis type="number" {...axeCommun} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="type"
          {...axeCommun}
          axisLine={false}
          width={150}
          style={{ fontFamily: "var(--font-plex-sans)" }}
        />
        <Tooltip content={<Infobulle />} cursor={{ fill: "#F5F7FA" }} />
        <Bar
          dataKey="valeur"
          name="Interventions"
          fill={CYAN}
          radius={[0, 4, 4, 0]}
          label={{
            position: "right",
            fill: ENCRE,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Charge par technicien : barres empilées par statut                          */
/* -------------------------------------------------------------------------- */

export function GraphiqueCharge({
  donnees,
}: {
  donnees: {
    nom: string;
    ASSIGNEE: number;
    EN_COURS: number;
    TERMINEE: number;
    ANNULEE: number;
  }[];
}) {
  const segments: Statut[] = ["ASSIGNEE", "EN_COURS", "TERMINEE", "ANNULEE"];

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, donnees.length * 46)}>
      <BarChart
        data={donnees}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
        barCategoryGap={10}
      >
        <CartesianGrid stroke={GRILLE} horizontal={false} />
        <XAxis type="number" {...axeCommun} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="nom"
          {...axeCommun}
          axisLine={false}
          width={96}
          style={{ fontFamily: "var(--font-plex-sans)" }}
        />
        <Tooltip content={<Infobulle />} cursor={{ fill: "#F5F7FA" }} />
        <Legend {...legende} />
        {segments.map((statut) => (
          <Bar
            key={statut}
            dataKey={statut}
            name={STATUT_LABELS[statut]}
            stackId="charge"
            fill={STATUT_COULEURS[statut].hex}
            /* 2px de surface entre les segments empilés */
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
