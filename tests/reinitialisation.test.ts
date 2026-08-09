import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import { preparerBase, supprimerBase } from "./aide";
import { prisma as client } from "@/lib/prisma";
import {
  DUREE_JETON_MINUTES,
  compteDuJeton,
  demanderReinitialisation,
  empreinteDe,
  reinitialiserMotDePasse,
} from "@/lib/reinitialisation";
import { ErreurMetier } from "@/lib/interventions";
import {
  MAX_DEMANDES_RESET,
  enregistrerDemande,
  enregistrerEchec,
  oublierEchecsDuCompte,
  reinitialiserLimitation,
  secondesAvantNouvelleDemande,
  secondesAvantNouvelleTentative,
} from "@/lib/limitation";

/**
 * Password reset, against a real database.
 *
 * A reset link is a temporary key to somebody's account, so the tests here are
 * about what must *not* happen: the token must not be readable from the
 * database, must not survive its hour, must not work twice, and the request
 * form must not reveal which addresses have an account.
 */

type Prisma = Awaited<ReturnType<typeof preparerBase>>;

let prisma: Prisma;

const MINUTE = 60_000;
const REPERE = new Date("2026-08-10T09:00:00Z");
const plusTard = (minutes: number) =>
  new Date(REPERE.getTime() + minutes * MINUTE);

async function creerCompte(
  email: string,
  statutCompte = "ACTIF",
  motDePasse = "AncienMdp1",
) {
  return prisma.utilisateur.create({
    data: {
      email,
      motDePasse: await bcrypt.hash(motDePasse, 10),
      role: "CLIENT",
      nom: "Test",
      prenom: "Amel",
      telephone: "+216 20 000 000",
      statutCompte,
    },
  });
}

beforeAll(async () => {
  prisma = await preparerBase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await client.$disconnect();
  supprimerBase();
});

beforeEach(async () => {
  await prisma.utilisateur.deleteMany();
  reinitialiserLimitation();
});

/* -------------------------------------------------------------------------- */

describe("Le jeton", () => {
  it("n’est jamais stocké en clair : la base n’en a que l’empreinte", async () => {
    const compte = await creerCompte("amel@test.tn");
    const demande = await demanderReinitialisation(compte.email, REPERE);

    const enBase = await prisma.utilisateur.findUnique({
      where: { id: compte.id },
      select: { jetonReset: true },
    });

    expect(demande?.jeton).toBeTruthy();
    expect(enBase?.jetonReset).not.toBe(demande!.jeton);
    expect(enBase?.jetonReset).toBe(empreinteDe(demande!.jeton));
    // Une empreinte SHA-256 : 64 caractères hexadécimaux, rien d'autre.
    expect(enBase?.jetonReset).toMatch(/^[0-9a-f]{64}$/);
  });

  it("est différent à chaque demande", async () => {
    const compte = await creerCompte("amel@test.tn");
    const un = await demanderReinitialisation(compte.email, REPERE);
    const deux = await demanderReinitialisation(compte.email, REPERE);

    expect(un!.jeton).not.toBe(deux!.jeton);
  });

  it("rend le lien précédent inutilisable quand un nouveau est demandé", async () => {
    const compte = await creerCompte("amel@test.tn");
    const ancien = await demanderReinitialisation(compte.email, REPERE);
    await demanderReinitialisation(compte.email, REPERE);

    await expect(
      reinitialiserMotDePasse(ancien!.jeton, "NouveauMdp1", REPERE),
    ).rejects.toThrow(ErreurMetier);
  });

  it("expire au bout de la durée annoncée", async () => {
    const compte = await creerCompte("amel@test.tn");
    const demande = await demanderReinitialisation(compte.email, REPERE);

    // Une minute avant l'échéance : encore bon.
    expect(
      await compteDuJeton(demande!.jeton, plusTard(DUREE_JETON_MINUTES - 1)),
    ).not.toBeNull();

    // Une minute après : plus rien.
    expect(
      await compteDuJeton(demande!.jeton, plusTard(DUREE_JETON_MINUTES + 1)),
    ).toBeNull();

    await expect(
      reinitialiserMotDePasse(
        demande!.jeton,
        "NouveauMdp1",
        plusTard(DUREE_JETON_MINUTES + 1),
      ),
    ).rejects.toThrow(ErreurMetier);
  });

  it("ne sert qu’une seule fois", async () => {
    const compte = await creerCompte("amel@test.tn");
    const demande = await demanderReinitialisation(compte.email, REPERE);

    await reinitialiserMotDePasse(demande!.jeton, "NouveauMdp1", REPERE);

    await expect(
      reinitialiserMotDePasse(demande!.jeton, "EncoreAutre2", REPERE),
    ).rejects.toThrow(ErreurMetier);
  });

  it("ne laisse pas deux soumissions simultanées passer toutes les deux", async () => {
    const compte = await creerCompte("amel@test.tn");
    const demande = await demanderReinitialisation(compte.email, REPERE);

    const resultats = await Promise.allSettled([
      reinitialiserMotDePasse(demande!.jeton, "NouveauMdp1", REPERE),
      reinitialiserMotDePasse(demande!.jeton, "AutreMdp2", REPERE),
    ]);

    expect(resultats.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("refuse un jeton inventé", async () => {
    await creerCompte("amel@test.tn");

    expect(await compteDuJeton("jeton-invente", REPERE)).toBeNull();
    await expect(
      reinitialiserMotDePasse("jeton-invente", "NouveauMdp1", REPERE),
    ).rejects.toThrow(ErreurMetier);
  });
});

/* -------------------------------------------------------------------------- */

describe("La demande", () => {
  it("ne dit rien d’une adresse inconnue", async () => {
    expect(await demanderReinitialisation("personne@test.tn", REPERE)).toBeNull();
  });

  it("ne part pas vers un compte qui ne peut pas se connecter", async () => {
    // Envoyer un lien à un compte désactivé promettrait un accès qui serait
    // refusé au bout du parcours.
    await creerCompte("attente@test.tn", "EN_ATTENTE");
    await creerCompte("desactive@test.tn", "DESACTIVE");

    expect(await demanderReinitialisation("attente@test.tn", REPERE)).toBeNull();
    expect(await demanderReinitialisation("desactive@test.tn", REPERE)).toBeNull();

    // Et aucun jeton n'a été posé au passage.
    const comptes = await prisma.utilisateur.findMany({
      select: { jetonReset: true },
    });
    expect(comptes.every((c) => c.jetonReset === null)).toBe(true);
  });

  it("accepte une adresse saisie avec des majuscules ou des espaces", async () => {
    await creerCompte("amel@test.tn");
    expect(
      await demanderReinitialisation("  Amel@Test.TN  ", REPERE),
    ).not.toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

describe("Le nouveau mot de passe", () => {
  it("remplace l’ancien, haché", async () => {
    const compte = await creerCompte("amel@test.tn", "ACTIF", "AncienMdp1");
    const demande = await demanderReinitialisation(compte.email, REPERE);

    await reinitialiserMotDePasse(demande!.jeton, "NouveauMdp1", REPERE);

    const apres = await prisma.utilisateur.findUnique({
      where: { id: compte.id },
      select: { motDePasse: true, jetonReset: true, jetonResetExpire: true },
    });

    expect(apres!.motDePasse).not.toBe("NouveauMdp1");
    expect(await bcrypt.compare("NouveauMdp1", apres!.motDePasse)).toBe(true);
    expect(await bcrypt.compare("AncienMdp1", apres!.motDePasse)).toBe(false);

    // Le jeton est effacé, pas seulement expiré.
    expect(apres!.jetonReset).toBeNull();
    expect(apres!.jetonResetExpire).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

describe("Plafond des demandes", () => {
  it("bloque au-delà du nombre de demandes toléré", () => {
    for (let i = 0; i < MAX_DEMANDES_RESET; i++) {
      expect(secondesAvantNouvelleDemande("amel@test.tn", "1.2.3.4")).toBe(0);
      enregistrerDemande("amel@test.tn", "1.2.3.4");
    }
    expect(
      secondesAvantNouvelleDemande("amel@test.tn", "1.2.3.4"),
    ).toBeGreaterThan(0);
  });

  it("ne ferme pas la connexion de quelqu’un qui demande un lien", () => {
    // Les deux compteurs sont distincts : demander un lien n'est pas se
    // tromper de mot de passe.
    for (let i = 0; i < MAX_DEMANDES_RESET + 2; i++) {
      enregistrerDemande("amel@test.tn", "1.2.3.4");
    }
    expect(secondesAvantNouvelleTentative("amel@test.tn", "1.2.3.4")).toBe(0);
  });

  it("lève le blocage de connexion du compte après réinitialisation", () => {
    for (let i = 0; i < 5; i++) enregistrerEchec("amel@test.tn", "1.2.3.4");
    expect(
      secondesAvantNouvelleTentative("amel@test.tn", "9.9.9.9"),
    ).toBeGreaterThan(0);

    oublierEchecsDuCompte("amel@test.tn");
    expect(secondesAvantNouvelleTentative("amel@test.tn", "9.9.9.9")).toBe(0);
  });
});
