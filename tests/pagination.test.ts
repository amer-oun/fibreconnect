import { describe, expect, it } from "vitest";

import {
  PAR_PAGE,
  calculerPagination,
  lienPage,
  lirePage,
} from "@/lib/pagination";

describe("lecture du numero de page", () => {
  it("vaut 1 quand le parametre est absent", () => {
    expect(lirePage({})).toBe(1);
  });

  it("lit un numero valide", () => {
    expect(lirePage({ page: "4" })).toBe(4);
  });

  it("ramene a 1 tout ce qui n'est pas un numero utilisable", () => {
    // Une URL bricolee a la main ne doit jamais produire un `skip` negatif.
    for (const brut of ["0", "-3", "abc", "", "1e999"]) {
      expect(lirePage({ page: brut })).toBeGreaterThanOrEqual(1);
    }
    expect(lirePage({ page: "0" })).toBe(1);
    expect(lirePage({ page: "-3" })).toBe(1);
    expect(lirePage({ page: "abc" })).toBe(1);
  });

  it("ignore un parametre repete", () => {
    expect(lirePage({ page: ["2", "9"] })).toBe(1);
  });
});

describe("calcul des bornes", () => {
  it("ne saute aucune ligne et n'en compte aucune deux fois", () => {
    const total = 3 * PAR_PAGE + 7;
    const vues = new Set<number>();

    const pages = calculerPagination(total, 1).pages;
    for (let p = 1; p <= pages; p++) {
      const { skip, take, total: t } = calculerPagination(total, p);
      expect(t).toBe(total);
      for (let i = skip; i < Math.min(skip + take, total); i++) vues.add(i);
    }

    expect(vues.size).toBe(total);
  });

  it("plafonne a la derniere page au lieu de rendre une liste vide", () => {
    // Filtrer depuis la page 7 doit atterrir sur la derniere page du nouveau
    // resultat, pas sur un ecran vide qui laisse croire qu'il n'y a rien.
    const etat = calculerPagination(30, 7);
    expect(etat.page).toBe(2);
    expect(etat.premier).toBe(PAR_PAGE + 1);
    expect(etat.dernier).toBe(30);
  });

  it("reste coherent sur un resultat vide", () => {
    const etat = calculerPagination(0, 1);
    expect(etat.pages).toBe(1);
    expect(etat.page).toBe(1);
    expect(etat.premier).toBe(0);
    expect(etat.dernier).toBe(0);
  });

  it("tient sur une seule page quand le total tombe juste", () => {
    const etat = calculerPagination(PAR_PAGE, 1);
    expect(etat.pages).toBe(1);
    expect(etat.dernier).toBe(PAR_PAGE);
  });

  it("ouvre une page de plus des qu'une ligne deborde", () => {
    expect(calculerPagination(PAR_PAGE + 1, 1).pages).toBe(2);
  });
});

describe("construction des liens", () => {
  it("conserve les filtres en place", () => {
    const lien = lienPage("/superviseur/interventions", { statut: "NOUVELLE", q: "sfax" }, 3);
    expect(lien).toContain("statut=NOUVELLE");
    expect(lien).toContain("q=sfax");
    expect(lien).toContain("page=3");
  });

  it("n'ecrit pas page=1 : l'adresse canonique reste la plus courte", () => {
    expect(lienPage("/technicien/historique", {}, 1)).toBe("/technicien/historique");
    expect(lienPage("/technicien/historique", { type: "AUTRE" }, 1)).toBe(
      "/technicien/historique?type=AUTRE",
    );
  });

  it("remplace la page courante au lieu de l'empiler", () => {
    const lien = lienPage("/x", { page: "2", statut: "TERMINEE" }, 5);
    expect(lien.match(/page=/g)).toHaveLength(1);
    expect(lien).toContain("page=5");
  });

  it("echappe ce qui doit l'etre", () => {
    expect(lienPage("/x", { q: "rue de l'épissure & co" }, 2)).not.toContain(" ");
  });
});
