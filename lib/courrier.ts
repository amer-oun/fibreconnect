import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { randomUUID } from "node:crypto";

import { SOCIETE, raisonSociale } from "@/lib/societe";

/**
 * The postman: composing an e-mail and handing it to a transport.
 *
 * Written by hand against RFC 5322 and RFC 5321 rather than pulled from a
 * package, for the reason stated in the project brief — no dependency joins
 * this project without being asked for. The protocol involved is small enough
 * to read in one sitting, and the two places it usually goes wrong (header
 * encoding and line endings) are handled once, here.
 *
 * **The body is always base64.** That is not a stylistic choice: SMTP forbids
 * a line of the message body from starting with a lone `.` (it would end the
 * transmission early) and limits lines to 1000 octets. Base64 output contains
 * no `.` at all and is wrapped at 76 characters, so both traps disappear
 * instead of being guarded against. The same reasoning drives the RFC 2047
 * encoded-words in the headers: a subject line reading « Intervention
 * terminée » is not ASCII, and an unencoded accent arrives as mojibake in
 * roughly half the mail clients in use.
 *
 * Three transports, chosen by `COURRIER_TRANSPORT` :
 *
 *  - `fichier` (défaut) — writes a real `.eml` file into `courrier/`, openable
 *    in any mail client. Nothing leaves the machine. This is what a laptop
 *    without an SMTP account runs, and it is honest: the message exists, it
 *    was simply not handed to a server.
 *  - `smtp` — actually sends. Selected automatically as soon as `SMTP_HOTE`
 *    is set.
 *  - `silencieux` — composes and drops. For the tests and the seed.
 *
 * Nothing here ever throws: a mail server that is down must not turn a
 * successful intervention into a 500. Failures are logged and returned.
 */

export type Lettre = {
  /** Adresse du destinataire. */
  a: string;
  /** Nom affiché du destinataire, facultatif. */
  nom?: string | null;
  sujet: string;
  /** Corps en texte brut. Pas de HTML : lu sur un téléphone, en tournée. */
  texte: string;
};

export type Transport = "fichier" | "smtp" | "silencieux";

export type ResultatEnvoi = {
  ok: boolean;
  transport: Transport;
  /** Chemin du fichier, réponse du serveur, ou raison de l'échec. */
  detail: string;
};

/** Une adresse plausible. Volontairement large : le rôle est d'écarter le vide. */
const ADRESSE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

const DELAI_SMTP = 15_000;

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Lue à chaque envoi, jamais figée au chargement du module : le serveur reste
 * allumé des jours, et changer `.env` doit suffire à changer de transport.
 */
export function configuration() {
  const hote = process.env.SMTP_HOTE?.trim() || "";
  const demande = process.env.COURRIER_TRANSPORT?.trim().toLowerCase();

  const transport: Transport =
    demande === "smtp" || demande === "fichier" || demande === "silencieux"
      ? demande
      : hote
        ? "smtp"
        : "fichier";

  const expediteur =
    process.env.COURRIER_EXPEDITEUR?.trim() || SOCIETE.email;

  return {
    transport,
    expediteur,
    nomExpediteur: raisonSociale,
    dossier: process.env.COURRIER_DOSSIER?.trim() || "courrier",
    smtp: {
      hote,
      port: Number(process.env.SMTP_PORT) || 587,
      utilisateur: process.env.SMTP_UTILISATEUR?.trim() || "",
      motDePasse: process.env.SMTP_MOTDEPASSE ?? "",
    },
  };
}

/** Racine publique, pour les liens cliquables dans les messages. */
export function lienVers(chemin: string) {
  const base = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  return `${base}${chemin.startsWith("/") ? chemin : `/${chemin}`}`;
}

/* -------------------------------------------------------------------------- */
/* Composition du message                                                     */
/* -------------------------------------------------------------------------- */

/** Octets d'UTF-8 par mot encodé : 45 → 60 caractères de base64, sous la limite de 75. */
const OCTETS_PAR_MOT = 45;

/**
 * Un en-tête, encodé si besoin (RFC 2047).
 *
 * Les retours à la ligne sont retirés avant tout : un nom d'utilisateur
 * contenant `\r\n` injecterait un en-tête arbitraire — un `Bcc:` par exemple —
 * dans un message que la société signe. Les noms viennent du formulaire
 * d'inscription, donc de l'extérieur.
 */
export function encoderEntete(valeur: string): string {
  const propre = valeur.replace(/[\r\n]+/g, " ").trim();
  if (!/[^\x20-\x7e]/.test(propre)) return propre;

  const morceaux: string[] = [];
  let courant = "";
  let octets = 0;

  // Découpe par caractère et non par octet : couper un é en deux produirait un
  // mot encodé invalide, que le client afficherait en losange noir.
  for (const caractere of propre) {
    const taille = Buffer.byteLength(caractere, "utf8");
    if (octets + taille > OCTETS_PAR_MOT) {
      morceaux.push(courant);
      courant = "";
      octets = 0;
    }
    courant += caractere;
    octets += taille;
  }
  if (courant) morceaux.push(courant);

  return morceaux
    .map((m) => `=?UTF-8?B?${Buffer.from(m, "utf8").toString("base64")}?=`)
    .join("\r\n ");
}

/** `"Sami Ayari" <sami@exemple.tn>`, le nom encodé ou entre guillemets. */
export function formaterAdresse(courriel: string, nom?: string | null): string {
  const adresse = courriel.replace(/[\r\n<>,;]/g, "").trim();
  if (!nom?.trim()) return adresse;

  const propre = nom.replace(/[\r\n]+/g, " ").trim();
  const affiche = /[^\x20-\x7e]/.test(propre)
    ? encoderEntete(propre)
    : `"${propre.replace(/["\\]/g, "\\$&")}"`;

  return `${affiche} <${adresse}>`;
}

const JOURS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MOIS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * `Mon, 10 Aug 2026 14:03:00 +0100`.
 *
 * Écrit à la main plutôt qu'avec `Intl` : le format de la RFC 5322 est en
 * anglais et figé, il ne doit surtout pas suivre la locale du serveur.
 */
export function dateRfc5322(date: Date): string {
  const nb = (n: number) => String(n).padStart(2, "0");
  const decalage = -date.getTimezoneOffset();
  const signe = decalage < 0 ? "-" : "+";
  const absolu = Math.abs(decalage);

  return (
    `${JOURS[date.getDay()]}, ${nb(date.getDate())} ${MOIS[date.getMonth()]} ` +
    `${date.getFullYear()} ${nb(date.getHours())}:${nb(date.getMinutes())}:` +
    `${nb(date.getSeconds())} ${signe}${nb(Math.floor(absolu / 60))}${nb(absolu % 60)}`
  );
}

/** Le message complet, prêt à passer dans `DATA`. Lignes terminées par CRLF. */
export function composerMessage(
  lettre: Lettre,
  options: {
    expediteur: string;
    nomExpediteur: string;
    date?: Date;
    identifiant?: string;
  },
): string {
  const date = options.date ?? new Date();
  const domaine = options.expediteur.split("@")[1] ?? "localhost";
  const identifiant = options.identifiant ?? `${Date.now()}.${randomUUID()}`;

  const corps = Buffer.from(lettre.texte.replace(/\r?\n/g, "\r\n"), "utf8")
    .toString("base64")
    .replace(/.{1,76}/g, "$&\r\n")
    .trimEnd();

  return [
    `From: ${formaterAdresse(options.expediteur, options.nomExpediteur)}`,
    `To: ${formaterAdresse(lettre.a, lettre.nom)}`,
    `Subject: ${encoderEntete(lettre.sujet)}`,
    `Date: ${dateRfc5322(date)}`,
    `Message-ID: <${identifiant}@${domaine}>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    corps,
  ].join("\r\n");
}

/* -------------------------------------------------------------------------- */
/* Envoi                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Poste une lettre. **Ne lève jamais.**
 *
 * Appelée depuis `after()` : la réponse HTTP est déjà partie quand ce code
 * s'exécute, personne n'attend son résultat, et une exception ici n'aurait
 * nulle part où être rattrapée.
 */
export async function envoyer(lettre: Lettre): Promise<ResultatEnvoi> {
  const config = configuration();

  if (!ADRESSE.test(lettre.a.trim())) {
    return {
      ok: false,
      transport: config.transport,
      detail: `Adresse invalide : ${lettre.a}`,
    };
  }

  const message = composerMessage(lettre, {
    expediteur: config.expediteur,
    nomExpediteur: config.nomExpediteur,
  });

  try {
    switch (config.transport) {
      case "silencieux":
        return { ok: true, transport: "silencieux", detail: "non envoyé" };

      case "fichier": {
        const fichier = await deposerFichier(config.dossier, lettre, message);
        return { ok: true, transport: "fichier", detail: fichier };
      }

      case "smtp": {
        if (!config.smtp.hote) {
          throw new Error("SMTP_HOTE n’est pas renseigné.");
        }
        const reponse = await envoyerParSmtp(
          config.smtp,
          config.expediteur,
          lettre.a.trim(),
          message,
        );
        return { ok: true, transport: "smtp", detail: reponse };
      }
    }
  } catch (erreur) {
    const detail = erreur instanceof Error ? erreur.message : String(erreur);
    console.error(
      `Courriel non envoyé à ${lettre.a} (« ${lettre.sujet} ») : ${detail}`,
    );
    return { ok: false, transport: config.transport, detail };
  }
}

/* -------------------------------------------------------------------------- */
/* Transport « fichier »                                                      */
/* -------------------------------------------------------------------------- */

async function deposerFichier(dossier: string, lettre: Lettre, message: string) {
  const racine = path.isAbsolute(dossier)
    ? dossier
    : path.join(process.cwd(), dossier);
  await mkdir(racine, { recursive: true });

  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const destinataire = lettre.a.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
  const fichier = path.join(racine, `${horodatage}-${destinataire}.eml`);

  await writeFile(fichier, message, "utf8");
  console.info(`Courriel déposé dans ${fichier}`);
  return fichier;
}

/* -------------------------------------------------------------------------- */
/* Transport « smtp »                                                         */
/* -------------------------------------------------------------------------- */

type Reponse = { code: number; lignes: string[] };

/**
 * Une conversation SMTP.
 *
 * Le protocole est un échange de lignes : on écrit une commande, le serveur
 * répond par un code à trois chiffres. Une réponse peut tenir sur plusieurs
 * lignes, et c'est le quatrième caractère qui le dit — `250-` annonce une
 * suite, `250 ` termine.
 */
class Canal {
  private tampon = "";
  private accumulees: string[] = [];
  private file: Reponse[] = [];
  private attente: {
    resoudre: (r: Reponse) => void;
    rejeter: (e: Error) => void;
  } | null = null;
  private echec: Error | null = null;

  constructor(private socket: net.Socket) {
    socket.on("data", (bloc: Buffer) => this.absorber(bloc.toString("utf8")));
    socket.on("error", (e: Error) => this.rompre(e));
    socket.on("close", () =>
      this.rompre(new Error("Connexion SMTP fermée par le serveur.")),
    );
    socket.setTimeout(DELAI_SMTP, () =>
      this.rompre(new Error("Le serveur SMTP ne répond pas.")),
    );
  }

  private absorber(bloc: string) {
    this.tampon += bloc;
    let coupure = this.tampon.indexOf("\r\n");

    while (coupure !== -1) {
      const ligne = this.tampon.slice(0, coupure);
      this.tampon = this.tampon.slice(coupure + 2);
      this.accumulees.push(ligne);

      if (ligne[3] !== "-") {
        const reponse = { code: Number(ligne.slice(0, 3)), lignes: this.accumulees };
        this.accumulees = [];
        if (this.attente) {
          const { resoudre } = this.attente;
          this.attente = null;
          resoudre(reponse);
        } else {
          this.file.push(reponse);
        }
      }

      coupure = this.tampon.indexOf("\r\n");
    }
  }

  private rompre(erreur: Error) {
    this.echec ??= erreur;
    if (this.attente) {
      const { rejeter } = this.attente;
      this.attente = null;
      rejeter(erreur);
    }
    this.socket.destroy();
  }

  lire(): Promise<Reponse> {
    const dejaLa = this.file.shift();
    if (dejaLa) return Promise.resolve(dejaLa);
    if (this.echec) return Promise.reject(this.echec);
    return new Promise((resoudre, rejeter) => {
      this.attente = { resoudre, rejeter };
    });
  }

  ecrire(texte: string) {
    this.socket.write(texte);
  }

  /**
   * Écrit une commande et exige l'un des codes attendus.
   *
   * `libelle` existe pour une seule raison : les arguments d'`AUTH` sont le
   * mot de passe en base64. Sans lui, un refus du serveur recopierait ce
   * mot de passe dans le journal.
   */
  async commande(
    texte: string,
    attendus: number[],
    libelle?: string,
  ): Promise<Reponse> {
    this.ecrire(`${texte}\r\n`);
    return this.attendre(attendus, libelle ?? texte.split(" ")[0]);
  }

  async attendre(attendus: number[], quoi: string): Promise<Reponse> {
    const reponse = await this.lire();
    if (!attendus.includes(reponse.code)) {
      throw new Error(
        `SMTP a refusé ${quoi} : ${reponse.lignes.join(" / ") || reponse.code}`,
      );
    }
    return reponse;
  }

  /** Rend la socket nue, sans écouteurs : elle va être enveloppée par TLS. */
  liberer() {
    this.socket.removeAllListeners("data");
    this.socket.removeAllListeners("error");
    this.socket.removeAllListeners("close");
    this.socket.setTimeout(0);
    this.tampon = "";
    this.accumulees = [];
    this.file = [];
    return this.socket;
  }

  fermer() {
    this.socket.removeAllListeners("close");
    this.socket.end();
  }
}

function connecter(hote: string, port: number, chiffre: boolean): Promise<net.Socket> {
  return new Promise((resoudre, rejeter) => {
    const socket = chiffre
      ? tls.connect({ host: hote, port, servername: hote })
      : net.connect({ host: hote, port });

    const surErreur = (e: Error) => rejeter(e);
    socket.once("error", surErreur);
    socket.once(chiffre ? "secureConnect" : "connect", () => {
      socket.removeListener("error", surErreur);
      resoudre(socket);
    });
  });
}

/** Les extensions annoncées par le serveur, en majuscules : `STARTTLS`, `AUTH PLAIN LOGIN`… */
async function saluer(canal: Canal, domaine: string): Promise<string[]> {
  const reponse = await canal.commande(`EHLO ${domaine}`, [250]);
  return reponse.lignes.slice(1).map((l) => l.slice(4).toUpperCase());
}

async function authentifier(
  canal: Canal,
  extensions: string[],
  utilisateur: string,
  motDePasse: string,
) {
  const auth = extensions.find((e) => e.startsWith("AUTH")) ?? "";
  const b64 = (v: string) => Buffer.from(v, "utf8").toString("base64");

  if (auth.includes("PLAIN")) {
    await canal.commande(
      `AUTH PLAIN ${b64(`\0${utilisateur}\0${motDePasse}`)}`,
      [235],
      "l’authentification",
    );
    return;
  }

  // AUTH LOGIN : deux allers-retours, chaque valeur en base64. Le serveur
  // répond 334 (« à toi ») entre les deux.
  await canal.commande("AUTH LOGIN", [334], "l’authentification");
  await canal.commande(b64(utilisateur), [334], "l’identifiant");
  await canal.commande(b64(motDePasse), [235], "le mot de passe");
}

async function envoyerParSmtp(
  config: { hote: string; port: number; utilisateur: string; motDePasse: string },
  expediteur: string,
  destinataire: string,
  message: string,
): Promise<string> {
  // 465 est le port du TLS implicite : la négociation a lieu avant le premier
  // octet SMTP. 587 parle en clair puis passe à STARTTLS.
  const tlsDirect = config.port === 465;
  const domaine = expediteur.split("@")[1] ?? "localhost";

  let canal = new Canal(await connecter(config.hote, config.port, tlsDirect));

  try {
    await canal.attendre([220], "la connexion");
    let extensions = await saluer(canal, domaine);

    if (!tlsDirect && extensions.some((e) => e.startsWith("STARTTLS"))) {
      await canal.commande("STARTTLS", [220]);
      const nue = canal.liberer();
      const chiffree = await new Promise<tls.TLSSocket>((resoudre, rejeter) => {
        const s = tls.connect({ socket: nue, servername: config.hote });
        s.once("error", rejeter);
        s.once("secureConnect", () => resoudre(s));
      });
      canal = new Canal(chiffree);
      // Après STARTTLS, tout est à refaire : le serveur peut annoncer d'autres
      // extensions une fois la session chiffrée — l'authentification, souvent.
      extensions = await saluer(canal, domaine);
    }

    if (config.utilisateur) {
      await authentifier(canal, extensions, config.utilisateur, config.motDePasse);
    }

    await canal.commande(`MAIL FROM:<${expediteur}>`, [250]);
    await canal.commande(`RCPT TO:<${destinataire}>`, [250, 251]);
    await canal.commande("DATA", [354]);

    canal.ecrire(`${message}\r\n.\r\n`);
    const remise = await canal.attendre([250], "la remise du message");

    await canal.commande("QUIT", [221]).catch(() => undefined);
    canal.fermer();

    return remise.lignes.join(" / ");
  } catch (erreur) {
    canal.fermer();
    throw erreur;
  }
}
