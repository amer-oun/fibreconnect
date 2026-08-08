import { describe, expect, it } from "vitest";

import {
  DELAIS_PRISE_EN_CHARGE,
  PRIORITES,
  delaiDe,
  echeancePriseEnCharge,
  estHorsDelai,
  heuresAvantEcheance,
} from "@/lib/constants";
import { montantPourTableur } from "@/lib/monnaie";
import { bornesDuMois, moisDecale } from "@/lib/dates";

/**
 * Pick-up deadlines and the two formatting rules the exports depend on.
 *
 * All pure functions: the current instant is a parameter everywhere, so a
 * four-hour target is verified in microseconds instead of by waiting, and the
 * result never depends on when the suite happens to run.
 */

const HEURE = 3_600_000;
const REPERE = new Date("2026-08-08T12:00:00Z");
const ilYa = (heures: number) => new Date(REPERE.getTime() - heures * HEURE);

describe("Délais de prise en charge", () => {
  it("donne un délai à chaque priorité, du plus court au plus long", () => {
    for (const priorite of PRIORITES) {
      expect(DELAIS_PRISE_EN_CHARGE[priorite]).toBeGreaterThan(0);
    }
    expect(DELAIS_PRISE_EN_CHARGE.URGENTE).toBeLessThan(
      DELAIS_PRISE_EN_CHARGE.HAUTE,
    );
    expect(DELAIS_PRISE_EN_CHARGE.HAUTE).toBeLessThan(
      DELAIS_PRISE_EN_CHARGE.NORMALE,
    );
    expect(DELAIS_PRISE_EN_CHARGE.NORMALE).toBeLessThan(
      DELAIS_PRISE_EN_CHARGE.BASSE,
    );
  });

  it("retombe sur le délai normal pour une priorité inconnue", () => {
    // La colonne est un `String` en base : une valeur imprévue reste possible,
    // et elle ne doit pas faire disparaître la panne du décompte.
    expect(delaiDe("N’IMPORTE_QUOI")).toBe(DELAIS_PRISE_EN_CHARGE.NORMALE);
  });

  it("place l’échéance à la déclaration plus le délai", () => {
    const echeance = echeancePriseEnCharge(REPERE, "URGENTE");
    expect(echeance.getTime() - REPERE.getTime()).toBe(
      DELAIS_PRISE_EN_CHARGE.URGENTE * HEURE,
    );
  });

  it("compte les heures restantes, puis les heures de retard", () => {
    expect(heuresAvantEcheance(ilYa(1), "URGENTE", REPERE)).toBeCloseTo(3);
    expect(heuresAvantEcheance(ilYa(4), "URGENTE", REPERE)).toBeCloseTo(0);
    expect(heuresAvantEcheance(ilYa(6), "URGENTE", REPERE)).toBeCloseTo(-2);
  });

  it("ne déclare hors délai qu’une panne encore sans technicien", () => {
    const vieille = { priorite: "URGENTE", dateCreation: ilYa(10) };

    expect(estHorsDelai({ ...vieille, statut: "NOUVELLE" }, REPERE)).toBe(true);

    // Dès qu'un technicien accepte, la promesse est tenue : ce que dure ensuite
    // le chantier dépend d'un câble, pas de l'aiguillage.
    for (const statut of ["ASSIGNEE", "EN_COURS", "TERMINEE", "ANNULEE"]) {
      expect(estHorsDelai({ ...vieille, statut }, REPERE)).toBe(false);
    }
  });

  it("laisse une panne récente dans les délais, quelle que soit sa priorité", () => {
    for (const priorite of PRIORITES) {
      expect(
        estHorsDelai(
          { statut: "NOUVELLE", priorite, dateCreation: ilYa(0.5) },
          REPERE,
        ),
      ).toBe(false);
    }
  });

  it("classe par temps restant, pas par étiquette de priorité", () => {
    // C'est le tri du tableau de bord technicien : une normale de trois jours
    // passe devant une basse du matin, et devant une urgente déclarée à
    // l'instant — parce qu'elle est la plus près de rompre la promesse.
    const pannes = [
      { nom: "urgente-neuve", priorite: "URGENTE", dateCreation: ilYa(0) },
      { nom: "normale-vieille", priorite: "NORMALE", dateCreation: ilYa(71) },
      { nom: "basse-du-matin", priorite: "BASSE", dateCreation: ilYa(5) },
    ];

    const ordre = [...pannes]
      .sort(
        (a, b) =>
          heuresAvantEcheance(a.dateCreation, a.priorite, REPERE) -
          heuresAvantEcheance(b.dateCreation, b.priorite, REPERE),
      )
      .map((p) => p.nom);

    expect(ordre).toEqual([
      "normale-vieille",
      "urgente-neuve",
      "basse-du-matin",
    ]);
  });
});

describe("Montants pour tableur", () => {
  it("écrit un nombre à virgule, sans unité ni séparateur de milliers", () => {
    // Avec un séparateur de milliers, Excel lirait du texte et la colonne
    // « Montant » d'un registre comptable ne s'additionnerait pas.
    expect(montantPourTableur(105_500)).toBe("105,500");
    expect(montantPourTableur(1_240_000)).toBe("1240,000");
    expect(montantPourTableur(0)).toBe("0,000");
  });

  it("garde les trois décimales du dinar", () => {
    expect(montantPourTableur(80_000)).toBe("80,000");
    expect(montantPourTableur(18_500)).toBe("18,500");
    expect(montantPourTableur(1)).toBe("0,001");
  });
});

describe("Bornes d’un mois", () => {
  it("encadre le mois demandé, dernière milliseconde comprise", () => {
    const { debut, fin, cle } = bornesDuMois("2026-02");

    expect(cle).toBe("2026-02");
    expect(debut.getMonth()).toBe(1);
    expect(debut.getDate()).toBe(1);
    // 2026 n'est pas bissextile : février fait 28 jours.
    expect(fin.getDate()).toBe(28);
    expect(fin.getHours()).toBe(23);
    expect(fin.getMilliseconds()).toBe(999);
  });

  it("retombe sur le mois en cours plutôt que de lever", () => {
    // Un paramètre d'URL bricolé à la main ne doit pas casser une page.
    const maintenant = new Date();
    for (const bricole of ["", "2026", "2026-13", "n’importe quoi", null]) {
      const { debut } = bornesDuMois(bricole);
      expect(debut.getMonth()).toBe(maintenant.getMonth());
      expect(debut.getFullYear()).toBe(maintenant.getFullYear());
    }
  });

  it("ne propose pas de lien vers un mois qui n’a pas commencé", () => {
    const { debut } = bornesDuMois(null);
    expect(moisDecale(debut, -1)).toMatch(/^\d{4}-\d{2}$/);
    expect(moisDecale(debut, 1)).toBeNull();
  });
});
