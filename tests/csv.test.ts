import { describe, expect, it } from "vitest";

import { cellule } from "@/lib/csv";

/**
 * The CSV escaping rules look trivial and are not: a single unescaped quote
 * shifts every following column, and an unescaped leading `=` turns a
 * subscriber's name into a formula Excel will happily execute.
 */

describe("échappement d'une cellule CSV", () => {
  it("entoure toujours la valeur de guillemets", () => {
    expect(cellule("Tunis")).toBe('"Tunis"');
  });

  it("double les guillemets internes", () => {
    // Sans cela, la cellule se termine au milieu et decale tout le reste.
    expect(cellule('Box dite "Livebox"')).toBe('"Box dite ""Livebox"""');
  });

  it("garde intacts les points-virgules et les sauts de ligne", () => {
    expect(cellule("un; deux")).toBe('"un; deux"');
    expect(cellule("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });

  it("neutralise les valeurs qu'Excel prendrait pour des formules", () => {
    // Injection de formule : sans l'apostrophe, Excel calcule la cellule.
    for (const dangereux of ["=1+1", "+SUM(A1)", "-2", "@import", "\tTab"]) {
      expect(cellule(dangereux).startsWith("\"'")).toBe(true);
    }
  });

  it("laisse passer un texte qui contient un signe sans commencer par lui", () => {
    expect(cellule("débit 100-200 Mb/s")).toBe('"débit 100-200 Mb/s"');
  });

  it("rend une cellule vide pour l'absence de valeur", () => {
    expect(cellule(null)).toBe("");
    expect(cellule(undefined)).toBe("");
  });

  it("accepte un nombre", () => {
    expect(cellule(5)).toBe('"5"');
    expect(cellule(0)).toBe('"0"');
  });
});
