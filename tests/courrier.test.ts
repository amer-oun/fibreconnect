import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  composerMessage,
  dateRfc5322,
  encoderEntete,
  envoyer,
  formaterAdresse,
} from "@/lib/courrier";
import {
  lettreAcceptation,
  lettreCloture,
  lettrePaiement,
  lettreTechnicienValide,
} from "@/lib/courriels";

/**
 * The mail layer, from header encoding to the SMTP dialogue itself.
 *
 * The transport is exercised against a throwaway SMTP server started here, in
 * the test, on a random port: hand-written protocol code that nobody ever
 * speaks to is hand-written protocol code that nobody knows is broken. What
 * this cannot cover is TLS against a real provider — the negotiation happens
 * below the dialogue and needs a certificate.
 */

/*
 * Les variables du facteur sont remises une par une après chaque cas.
 * Remplacer `process.env` en bloc emporterait DATABASE_URL, que tests/setup.ts
 * a posé avant que le client Prisma ne soit construit : les fichiers de test
 * suivants s'en prendraient à la base de développement.
 */
const CLES = [
  "COURRIER_TRANSPORT",
  "COURRIER_DOSSIER",
  "COURRIER_EXPEDITEUR",
  "SMTP_HOTE",
  "SMTP_PORT",
  "SMTP_UTILISATEUR",
  "SMTP_MOTDEPASSE",
] as const;

const ORIGINE = Object.fromEntries(CLES.map((cle) => [cle, process.env[cle]]));

afterEach(() => {
  for (const cle of CLES) {
    const valeur = ORIGINE[cle];
    if (valeur === undefined) delete process.env[cle];
    else process.env[cle] = valeur;
  }
});

/* -------------------------------------------------------------------------- */

describe("Encodage des en-têtes", () => {
  it("laisse l’ASCII intact", () => {
    expect(encoderEntete("Facture FC-2026-0007")).toBe("Facture FC-2026-0007");
  });

  it("encode les accents en mot encodé UTF-8", () => {
    const encode = encoderEntete("Intervention terminée");
    expect(encode).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);

    const contenu = encode.slice("=?UTF-8?B?".length, -"?=".length);
    expect(Buffer.from(contenu, "base64").toString("utf8")).toBe(
      "Intervention terminée",
    );
  });

  it("découpe un sujet long en mots encodés d’au plus 75 caractères", () => {
    const long =
      "Intervention terminée — facture FC-2026-0042, réparation d’un câble endommagé à Ariana";
    const mots = encoderEntete(long).split("\r\n ");

    expect(mots.length).toBeGreaterThan(1);
    for (const mot of mots) {
      expect(mot.length).toBeLessThanOrEqual(75);
      expect(mot).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
    }

    // Recollé, le sujet doit être exactement celui de départ : un découpage au
    // milieu d'un caractère multi-octets produirait un losange noir.
    const recolle = mots
      .map((m) =>
        Buffer.from(m.slice("=?UTF-8?B?".length, -"?=".length), "base64").toString(
          "utf8",
        ),
      )
      .join("");
    expect(recolle).toBe(long);
  });

  it("refuse l’injection d’un en-tête par un nom d’utilisateur", () => {
    // Les noms viennent du formulaire d'inscription : ils sont hostiles par
    // hypothèse. Un \r\n accepté ici ajouterait un Bcc: au message.
    const encode = encoderEntete("Sami\r\nBcc: espion@exemple.tn");
    expect(encode).not.toContain("\r");
    expect(encode).not.toContain("\n");
  });

  it("met le nom d’affichage entre guillemets ou l’encode", () => {
    expect(formaterAdresse("sami@exemple.tn", "Sami Ayari")).toBe(
      '"Sami Ayari" <sami@exemple.tn>',
    );
    expect(formaterAdresse("sami@exemple.tn")).toBe("sami@exemple.tn");
    expect(formaterAdresse("s@exemple.tn", "Amélie")).toContain("=?UTF-8?B?");
  });

  it("écrit la date au format anglais figé de la RFC 5322", () => {
    expect(dateRfc5322(new Date(2026, 7, 10, 14, 3, 7))).toMatch(
      /^\w{3}, 10 Aug 2026 14:03:07 [+-]\d{4}$/,
    );
  });
});

/* -------------------------------------------------------------------------- */

describe("Composition du message", () => {
  const lettre = {
    a: "amel@exemple.tn",
    nom: "Amel Bouzid",
    sujet: "Intervention terminée — facture FC-2026-0007",
    texte: "Bonjour Amel,\n\nVotre intervention est terminée.\nTotal : 30,750 DT",
  };

  const message = composerMessage(lettre, {
    expediteur: "contact@fibreconnect.tn",
    nomExpediteur: "FibreConnect SARL",
    date: new Date(2026, 7, 10, 14, 3, 7),
    identifiant: "test",
  });

  it("sépare les en-têtes du corps par une ligne vide, en CRLF", () => {
    expect(message).toContain("\r\n\r\n");
    expect(message.split("\r\n\r\n")[0]).toContain("From: ");
  });

  it("porte les en-têtes MIME nécessaires à l’UTF-8", () => {
    expect(message).toContain('Content-Type: text/plain; charset="utf-8"');
    expect(message).toContain("Content-Transfer-Encoding: base64");
    expect(message).toContain("Message-ID: <test@fibreconnect.tn>");
  });

  it("rend le corps exactement, en CRLF, après décodage", () => {
    const corps = message.split("\r\n\r\n").slice(1).join("\r\n\r\n");
    expect(Buffer.from(corps, "base64").toString("utf8")).toBe(
      lettre.texte.replace(/\n/g, "\r\n"),
    );
  });

  it("n’émet aucune ligne de corps commençant par un point", () => {
    // Une ligne « . » seule termine la transmission SMTP. Le base64 ne peut pas
    // en produire — c'est précisément pourquoi le corps est encodé.
    const corps = message.split("\r\n\r\n").slice(1).join("\r\n\r\n");
    for (const ligne of corps.split("\r\n")) {
      expect(ligne.startsWith(".")).toBe(false);
      expect(ligne.length).toBeLessThanOrEqual(76);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("Transports", () => {
  it("ne lève pas et signale l’échec sur une adresse invalide", async () => {
    process.env.COURRIER_TRANSPORT = "silencieux";
    const resultat = await envoyer({
      a: "pas-une-adresse",
      sujet: "Test",
      texte: "Test",
    });

    expect(resultat.ok).toBe(false);
    expect(resultat.detail).toContain("Adresse invalide");
  });

  it("dépose un .eml relisible avec le transport fichier", async () => {
    const dossier = await mkdtemp(path.join(tmpdir(), "courrier-"));
    try {
      process.env.COURRIER_TRANSPORT = "fichier";
      process.env.COURRIER_DOSSIER = dossier;

      const resultat = await envoyer({
        a: "amel@exemple.tn",
        nom: "Amel Bouzid",
        sujet: "Intervention terminée",
        texte: "Bonjour Amel,",
      });

      expect(resultat.ok).toBe(true);
      const fichiers = await readdir(dossier);
      expect(fichiers).toHaveLength(1);
      expect(fichiers[0].endsWith(".eml")).toBe(true);

      const contenu = await readFile(path.join(dossier, fichiers[0]), "utf8");
      expect(contenu).toContain('To: "Amel Bouzid" <amel@exemple.tn>');
    } finally {
      await rm(dossier, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------------- */

/** Journal de ce qu'un faux serveur SMTP a reçu. */
type Trace = { commandes: string[]; message: string };

/**
 * Un serveur SMTP jetable, juste assez complet pour la conversation que le
 * client tient réellement : accueil, EHLO multiligne, AUTH PLAIN, enveloppe,
 * DATA terminé par un point seul.
 */
function serveurJetable(trace: Trace) {
  return new Promise<{ port: number; fermer: () => Promise<void> }>(
    (resoudre) => {
      const serveur = net.createServer((socket) => {
        let tampon = "";
        let dansLeMessage = false;

        socket.write("220 essai.local ESMTP\r\n");

        socket.on("data", (bloc) => {
          tampon += bloc.toString("utf8");

          for (;;) {
            if (dansLeMessage) {
              const fin = tampon.indexOf("\r\n.\r\n");
              if (fin === -1) return;
              trace.message = tampon.slice(0, fin);
              tampon = tampon.slice(fin + 5);
              dansLeMessage = false;
              socket.write("250 2.0.0 Message accepté\r\n");
              continue;
            }

            const coupure = tampon.indexOf("\r\n");
            if (coupure === -1) return;
            const ligne = tampon.slice(0, coupure);
            tampon = tampon.slice(coupure + 2);
            trace.commandes.push(ligne);

            const verbe = ligne.split(" ")[0].toUpperCase();
            if (verbe === "EHLO") {
              socket.write("250-essai.local\r\n250-SIZE 10485760\r\n250 AUTH PLAIN LOGIN\r\n");
            } else if (verbe === "AUTH") {
              socket.write("235 2.7.0 Authentifié\r\n");
            } else if (verbe === "MAIL" || verbe === "RCPT") {
              socket.write("250 2.1.0 D’accord\r\n");
            } else if (verbe === "DATA") {
              dansLeMessage = true;
              socket.write("354 Envoyez le message, terminez par un point seul\r\n");
            } else if (verbe === "QUIT") {
              socket.write("221 2.0.0 Au revoir\r\n");
              socket.end();
              return;
            } else {
              socket.write("502 5.5.2 Commande inconnue\r\n");
            }
          }
        });

        socket.on("error", () => undefined);
      });

      serveur.listen(0, "127.0.0.1", () => {
        const adresse = serveur.address() as net.AddressInfo;
        resoudre({
          port: adresse.port,
          fermer: () =>
            new Promise<void>((fini) => {
              serveur.close(() => fini());
            }),
        });
      });
    },
  );
}

describe("Dialogue SMTP", () => {
  it("mène la conversation complète et remet un message décodable", async () => {
    const trace: Trace = { commandes: [], message: "" };
    const serveur = await serveurJetable(trace);

    try {
      process.env.COURRIER_TRANSPORT = "smtp";
      process.env.SMTP_HOTE = "127.0.0.1";
      process.env.SMTP_PORT = String(serveur.port);
      process.env.SMTP_UTILISATEUR = "facteur@fibreconnect.tn";
      process.env.SMTP_MOTDEPASSE = "secret";
      process.env.COURRIER_EXPEDITEUR = "contact@fibreconnect.tn";

      const resultat = await envoyer({
        a: "amel@exemple.tn",
        nom: "Amel Bouzid",
        sujet: "Intervention terminée — facture FC-2026-0007",
        texte: "Bonjour Amel,\n\nTotal à régler : 30,750 DT",
      });

      expect(resultat.ok).toBe(true);
      expect(resultat.transport).toBe("smtp");

      const verbes = trace.commandes.map((c) => c.split(" ")[0].toUpperCase());
      expect(verbes).toContain("EHLO");
      expect(verbes).toContain("AUTH");
      expect(verbes).toContain("DATA");
      expect(verbes).toContain("QUIT");

      // L'enveloppe SMTP, distincte des en-têtes du message.
      expect(trace.commandes).toContain("MAIL FROM:<contact@fibreconnect.tn>");
      expect(trace.commandes).toContain("RCPT TO:<amel@exemple.tn>");

      // AUTH PLAIN transporte \0utilisateur\0motdepasse en base64.
      const auth = trace.commandes.find((c) => c.startsWith("AUTH"))!;
      expect(
        Buffer.from(auth.split(" ")[2], "base64").toString("utf8"),
      ).toBe("\0facteur@fibreconnect.tn\0secret");

      // Et le message arrivé au bout est bien celui qu'on a écrit.
      const corps = trace.message.split("\r\n\r\n").slice(1).join("\r\n\r\n");
      expect(Buffer.from(corps, "base64").toString("utf8")).toContain(
        "Total à régler : 30,750 DT",
      );
    } finally {
      await serveur.fermer();
    }
  });

  it("signale l’échec sans lever quand le serveur est injoignable", async () => {
    process.env.COURRIER_TRANSPORT = "smtp";
    // Port fermé : la connexion est refusée tout de suite, sans attente.
    process.env.SMTP_HOTE = "127.0.0.1";
    process.env.SMTP_PORT = "1";

    const resultat = await envoyer({
      a: "amel@exemple.tn",
      sujet: "Test",
      texte: "Test",
    });

    expect(resultat.ok).toBe(false);
    expect(resultat.detail.length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */

describe("Contenu des messages", () => {
  const abonne = { courriel: "amel@exemple.tn", prenom: "Amel", nom: "Bouzid" };
  const technicien = {
    prenom: "Karim",
    nom: "Trabelsi",
    matricule: "FC-001",
    telephone: "+216 20 123 456",
  };

  it("donne à l’abonné le nom et le téléphone du technicien", () => {
    const lettre = lettreAcceptation({
      abonne,
      interventionId: "clx000000000000a1b2c3",
      typePanne: "COUPURE_TOTALE",
      dateCreation: new Date(2026, 7, 9, 9, 30),
      technicien,
    });

    expect(lettre.a).toBe("amel@exemple.tn");
    expect(lettre.sujet).toContain("#A1B2C3");
    expect(lettre.texte).toContain("Karim Trabelsi");
    expect(lettre.texte).toContain("+216 20 123 456");
    expect(lettre.texte).toContain("Coupure totale");
  });

  it("distingue une réaffectation d’une première prise en charge", () => {
    const commun = {
      abonne,
      interventionId: "clx000000000000a1b2c3",
      typePanne: "COUPURE_TOTALE",
      dateCreation: new Date(2026, 7, 9, 9, 30),
      technicien,
    };

    expect(lettreAcceptation(commun).sujet).toContain("prise en charge");
    expect(
      lettreAcceptation({ ...commun, reaffectation: true }).sujet,
    ).toContain("Changement de technicien");
  });

  it("détaille la facture et n’annonce le solde que s’il reste à payer", () => {
    const facture = {
      id: "fac1",
      numero: "FC-2026-0007",
      montantHT: 25_000,
      tauxTva: 0.19,
      montantTva: 4_750,
      timbreFiscal: 1_000,
      montantTotal: 30_750,
    };

    const due = lettreCloture({
      abonne,
      interventionId: "int1",
      typePanne: "COUPURE_TOTALE",
      rapport: "Soudure refaite au point de branchement.",
      facture,
      resteAPayer: 30_750,
    });

    expect(due.sujet).toContain("FC-2026-0007");
    expect(due.texte).toContain("TVA 19 %");
    expect(due.texte).toContain("30,750 DT");
    expect(due.texte).toContain("Soudure refaite");
    expect(due.texte).toContain("Reste à régler");

    const soldee = lettreCloture({
      abonne,
      interventionId: "int1",
      typePanne: "COUPURE_TOTALE",
      rapport: null,
      facture,
      resteAPayer: 0,
    });

    expect(soldee.texte).toContain("déjà soldée");
    expect(soldee.texte).not.toContain("Reste à régler");
  });

  it("ne met jamais de numéro de carte dans un reçu, seulement l’empreinte", () => {
    const lettre = lettrePaiement({
      abonne,
      interventionId: "int1",
      factureId: "fac1",
      numero: "FC-2026-0007",
      montant: 30_750,
      moyen: "CARTE",
      detail: "Visa ••••4242",
      reference: "PAY-ABC123",
      date: new Date(2026, 7, 10, 11, 0),
      resteAPayer: 0,
    });

    expect(lettre.texte).toContain("Visa ••••4242");
    expect(lettre.texte).toContain("PAY-ABC123");
    expect(lettre.texte).toContain("soldée");
    expect(lettre.texte).not.toMatch(/\d{8,}/);
  });

  it("rappelle au technicien validé que son secteur ne dépend pas de lui", () => {
    const lettre = lettreTechnicienValide({
      courriel: "karim@exemple.tn",
      prenom: "Karim",
      nom: "Trabelsi",
      matricule: "FC-001",
      zone: "Tunis",
    });

    expect(lettre.texte).toContain("FC-001");
    expect(lettre.texte).toContain("Tunis");
    expect(lettre.texte).toContain("pas modifiable");
  });
});
