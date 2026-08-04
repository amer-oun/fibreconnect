import { beforeEach, describe, expect, it } from "vitest";

import {
  BLOCAGE_MS,
  FENETRE_MS,
  MAX_PAR_ADRESSE,
  MAX_PAR_COMPTE,
  adresseDeLaRequete,
  enregistrerEchec,
  oublierEchecs,
  reinitialiserLimitation,
  secondesAvantNouvelleTentative,
} from "@/lib/limitation";

/**
 * The limiter takes an explicit `maintenant`, so these tests move time forward
 * by hand instead of sleeping: a fifteen-minute window is checked in
 * microseconds, and the result never depends on how fast the machine is.
 */

const T0 = 1_700_000_000_000;
const VICTIME = "cible@fibreconnect.tn";
const IP = "41.226.10.5";

beforeEach(() => {
  reinitialiserLimitation();
});

describe("limitation des tentatives de connexion", () => {
  it("laisse passer tant que le seuil n'est pas atteint", () => {
    for (let i = 0; i < MAX_PAR_COMPTE - 1; i++) {
      enregistrerEchec(VICTIME, IP, T0 + i);
    }
    expect(secondesAvantNouvelleTentative(VICTIME, IP, T0 + 100)).toBe(0);
  });

  it("bloque le compte au seuil atteint", () => {
    for (let i = 0; i < MAX_PAR_COMPTE; i++) {
      enregistrerEchec(VICTIME, IP, T0 + i);
    }
    expect(
      secondesAvantNouvelleTentative(VICTIME, IP, T0 + 100),
    ).toBeGreaterThan(0);
  });

  it("libère le compte une fois le blocage écoulé", () => {
    for (let i = 0; i < MAX_PAR_COMPTE; i++) {
      enregistrerEchec(VICTIME, IP, T0 + i);
    }
    const apres = T0 + BLOCAGE_MS + 1_000;
    expect(secondesAvantNouvelleTentative(VICTIME, IP, apres)).toBe(0);
  });

  it("ne bloque pas des fautes de frappe espacées dans le temps", () => {
    // Une erreur tous les deux jours : jamais dans la même fenêtre, donc le
    // compteur repart de 1 à chaque fois.
    const deuxJours = 2 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < MAX_PAR_COMPTE * 3; i++) {
      enregistrerEchec(VICTIME, IP, T0 + i * deuxJours);
    }
    const apres = T0 + MAX_PAR_COMPTE * 3 * deuxJours + 1;
    expect(secondesAvantNouvelleTentative(VICTIME, IP, apres)).toBe(0);
  });

  it("n'affecte pas les autres comptes", () => {
    for (let i = 0; i < MAX_PAR_COMPTE; i++) {
      enregistrerEchec(VICTIME, IP, T0 + i);
    }
    // Un voisin depuis une autre adresse doit pouvoir se connecter.
    expect(secondesAvantNouvelleTentative("autre@x.tn", "1.1.1.1", T0)).toBe(0);
  });

  it("traite l'adresse e-mail sans tenir compte de la casse", () => {
    for (let i = 0; i < MAX_PAR_COMPTE; i++) {
      enregistrerEchec(VICTIME.toUpperCase(), IP, T0 + i);
    }
    expect(
      secondesAvantNouvelleTentative(VICTIME, "9.9.9.9", T0 + 100),
    ).toBeGreaterThan(0);
  });

  it("bloque aussi la pulvérisation d'un mot de passe sur plusieurs comptes", () => {
    // Chaque tentative vise une adresse différente : le compteur par compte ne
    // se déclenche jamais. C'est celui de l'adresse IP qui doit arrêter ça.
    for (let i = 0; i < MAX_PAR_ADRESSE; i++) {
      enregistrerEchec(`victime${i}@fibreconnect.tn`, IP, T0 + i);
    }
    expect(
      secondesAvantNouvelleTentative("jamais-vu@fibreconnect.tn", IP, T0 + 100),
    ).toBeGreaterThan(0);
  });

  it("efface le compteur quand le mot de passe est enfin correct", () => {
    for (let i = 0; i < MAX_PAR_COMPTE - 1; i++) {
      enregistrerEchec(VICTIME, IP, T0 + i);
    }
    oublierEchecs(VICTIME, IP);

    // Sans l'effacement, une seule erreur suffirait à atteindre le seuil.
    enregistrerEchec(VICTIME, IP, T0 + 200);
    expect(secondesAvantNouvelleTentative(VICTIME, IP, T0 + 300)).toBe(0);
  });

  it("annonce une attente qui ne dépasse pas la durée du blocage", () => {
    for (let i = 0; i < MAX_PAR_COMPTE; i++) {
      enregistrerEchec(VICTIME, IP, T0 + i);
    }
    const attente = secondesAvantNouvelleTentative(VICTIME, IP, T0 + 100);
    expect(attente).toBeLessThanOrEqual(BLOCAGE_MS / 1000);
    expect(FENETRE_MS).toBeGreaterThan(0);
  });
});

describe("adresse de la requête", () => {
  it("retient le premier maillon de x-forwarded-for", () => {
    // Le proxy ajoute les siens à la suite ; le client est en tête.
    expect(
      adresseDeLaRequete({ "x-forwarded-for": "41.226.10.5, 10.0.0.1" }),
    ).toBe("41.226.10.5");
  });

  it("se rabat sur x-real-ip", () => {
    expect(adresseDeLaRequete({ "x-real-ip": "41.226.10.9" })).toBe(
      "41.226.10.9",
    );
  });

  it("ne renvoie jamais de chaîne vide", () => {
    expect(adresseDeLaRequete(undefined)).toBe("inconnue");
    expect(adresseDeLaRequete({ "x-real-ip": "   " })).toBe("inconnue");
  });
});
