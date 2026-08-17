import { readdir, unlink } from "node:fs/promises";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  DOSSIER_TELEVERSEMENTS,
  TAILLE_MAX_OCTETS,
  enregistrerPhoto,
  estCheminPhotoValide,
  estNomPhotoValide,
} from "@/lib/televersement";
import { ErreurMetier } from "@/lib/interventions";

/**
 * Uploads, from the point of view of what must not reach the disk.
 *
 * This module is the only place where bytes chosen by a user are written to
 * the filesystem, so the tests are written backwards, like those of the reset
 * link: the declared type must not be believed, the name must not be chosen by
 * the caller, and a name arriving in a URL must not walk out of the folder.
 */

/* Les octets qui ouvrent réellement chaque format accepté. */
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];

/** Un fichier remis tel que le navigateur le présente : contenu + type annoncé. */
function fichier(octets: number[], nom: string, typeAnnonce: string) {
  // Rembourré : une image d'un seul octet n'existe pas, et la taille compte.
  const donnees = new Uint8Array([...octets, ...new Array(64).fill(0)]);
  return new File([donnees], nom, { type: typeAnnonce });
}

/**
 * Nettoyage par différence, et non par liste de ce qu'on a cru écrire.
 *
 * Un test qui échoue ici échoue précisément parce qu'un fichier a atteint le
 * disque alors qu'il ne devait pas : s'en remettre aux chemins rendus par
 * `enregistrerPhoto` laisserait justement ces fichiers-là derrière soi. On
 * relève donc le dossier avant, et on efface tout ce qui est apparu depuis.
 */
const avant = new Set(await readdir(DOSSIER_TELEVERSEMENTS));

afterAll(async () => {
  for (const nom of await readdir(DOSSIER_TELEVERSEMENTS)) {
    if (!avant.has(nom)) await unlink(path.join(DOSSIER_TELEVERSEMENTS, nom));
  }
});

/* -------------------------------------------------------------------------- */

describe("Le type d’un fichier envoyé", () => {
  it("est lu dans le contenu, jamais dans ce que le client annonce", async () => {
    // Le cœur du sujet : `File.type` vient du navigateur, donc de l'appelant.
    // Des octets quelconques présentés comme une image doivent être refusés.
    const truque = fichier(
      [...Buffer.from("<script>alert(1)</script>")],
      "photo.jpg",
      "image/jpeg",
    );

    await expect(enregistrerPhoto(truque)).rejects.toThrow(ErreurMetier);
  });

  it("ne se laisse pas convaincre par une extension d’image", async () => {
    const pdf = fichier([...Buffer.from("%PDF-1.7")], "facture.png", "image/png");
    await expect(enregistrerPhoto(pdf)).rejects.toThrow(ErreurMetier);
  });

  it("accepte les trois formats réels", async () => {
    // Le type annoncé est volontairement faux ou vide : seul le contenu décide.
    expect(await enregistrerPhoto(fichier(JPEG, "a.png", "image/png"))).toMatch(/\.jpg$/);
    expect(await enregistrerPhoto(fichier(PNG, "b.jpg", ""))).toMatch(/\.png$/);
    expect(await enregistrerPhoto(fichier(WEBP, "c.txt", "text/plain"))).toMatch(
      /\.webp$/,
    );
  });
});

/* -------------------------------------------------------------------------- */

describe("La taille", () => {
  it("refuse un fichier vide", async () => {
    await expect(
      enregistrerPhoto(new File([], "vide.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow(ErreurMetier);
  });

  it("refuse au-delà de la limite annoncée", async () => {
    const trop = new Uint8Array(TAILLE_MAX_OCTETS + 1);
    trop.set(JPEG);
    await expect(
      enregistrerPhoto(new File([trop], "grande.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow(ErreurMetier);
  });
});

/* -------------------------------------------------------------------------- */

describe("Le nom du fichier écrit", () => {
  it("est tiré au sort, pas repris de l’envoi", async () => {
    const chemin = await enregistrerPhoto(fichier(PNG, "photo-de-nadia.png", "image/png"));

    expect(chemin).not.toContain("photo-de-nadia");
    expect(estCheminPhotoValide(chemin)).toBe(true);
  });

  it("diffère à chaque envoi, donc aucun fichier n’en écrase un autre", async () => {
    const un = await enregistrerPhoto(fichier(PNG, "photo.png", "image/png"));
    const deux = await enregistrerPhoto(fichier(PNG, "photo.png", "image/png"));

    expect(un).not.toBe(deux);
  });
});

/* -------------------------------------------------------------------------- */

describe("Un nom reçu dans une URL", () => {
  const uuid = "0189d3f4-5b6c-4d7e-8f90-a1b2c3d4e5f6";

  it("est accepté s’il a exactement la forme que nous écrivons", () => {
    expect(estNomPhotoValide(`${uuid}.jpg`)).toBe(true);
    expect(estNomPhotoValide(`${uuid}.png`)).toBe(true);
    expect(estNomPhotoValide(`${uuid}.webp`)).toBe(true);
  });

  it("ne peut pas sortir du dossier", () => {
    // Sans ce garde-fou, `readFile` lirait n'importe quel fichier du serveur.
    for (const tentative of [
      "../prisma/dev.db",
      "../../.env",
      "..%2F.env",
      "/etc/passwd",
      "C:\\Windows\\win.ini",
      `${uuid}.jpg/../../.env`,
    ]) {
      expect(estNomPhotoValide(tentative)).toBe(false);
    }
  });

  it("refuse une extension que nous n’écrivons jamais", () => {
    expect(estNomPhotoValide(`${uuid}.svg`)).toBe(false);
    expect(estNomPhotoValide(`${uuid}.html`)).toBe(false);
    expect(estNomPhotoValide(uuid)).toBe(false);
  });

  it("refuse un chemin qui ne vient pas de notre route", () => {
    expect(estCheminPhotoValide(`https://ailleurs.tn/${uuid}.jpg`)).toBe(false);
    expect(estCheminPhotoValide(`/api/photos/../../.env`)).toBe(false);
    expect(estCheminPhotoValide(null)).toBe(false);
    expect(estCheminPhotoValide(42)).toBe(false);
  });
});
