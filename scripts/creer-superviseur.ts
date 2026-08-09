/**
 * Creates a supervisor account — the way a real deployment gets its first login.
 *
 *     npm run creer-superviseur -- --email leila@fibreconnect.tn \
 *       --nom "Ben Salah" --prenom Leila --telephone "+216 71 234 567"
 *
 * **This is not the seed.** `prisma db seed` wipes the database before filling
 * it, which makes it useless once the application is in service: the only way
 * to obtain an account would be to destroy the data it protects. This script
 * only ever inserts, refuses an address already taken, and touches nothing else.
 *
 * Without a password argument it generates one and prints it **once**. Choose
 * your own with `--motdepasse` if you prefer; either way, change it after the
 * first sign-in from « Mon compte ».
 */

import { randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { BCRYPT_ROUNDS } from "../lib/constants";

const prisma = new PrismaClient();

/** `--email x` et `--email=x` sont acceptes tous les deux. */
function lireArguments(): Record<string, string> {
  const args: Record<string, string> = {};
  const bruts = process.argv.slice(2);

  for (let i = 0; i < bruts.length; i++) {
    const brut = bruts[i];
    if (!brut.startsWith("--")) continue;

    const egal = brut.indexOf("=");
    if (egal !== -1) {
      args[brut.slice(2, egal)] = brut.slice(egal + 1);
    } else {
      args[brut.slice(2)] = bruts[i + 1]?.startsWith("--")
        ? ""
        : (bruts[++i] ?? "");
    }
  }
  return args;
}

/**
 * Mot de passe aleatoire, lisible au telephone.
 *
 * Sans chiffres ambigus (0/O, 1/l/I) : ce mot de passe est dicte ou recopie a
 * la main au moins une fois, et un « l » pris pour un « 1 » coute un appel.
 */
function motDePasseAleatoire() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const octets = randomBytes(16);
  return [...octets].map((o) => alphabet[o % alphabet.length]).join("");
}

/** Les memes exigences que le formulaire de l'application. */
function motDePasseValide(mdp: string) {
  return mdp.length >= 8 && /[A-Za-z]/.test(mdp) && /[0-9]/.test(mdp);
}

const AIDE = `
Crée un compte superviseur, sans rien effacer.

  npm run creer-superviseur -- --email <adresse> --nom <nom> --prenom <prénom> \\
    --telephone <numéro> [--motdepasse <mot de passe>]

Le mot de passe est engendré s'il n'est pas fourni, et affiché une seule fois.
`;

async function main() {
  const args = lireArguments();

  if (args.aide !== undefined || args.help !== undefined) {
    console.log(AIDE);
    return;
  }

  const manquants = ["email", "nom", "prenom", "telephone"].filter(
    (cle) => !args[cle]?.trim(),
  );
  if (manquants.length > 0) {
    console.error(`Argument(s) manquant(s) : ${manquants.join(", ")}`);
    console.error(AIDE);
    process.exit(1);
  }

  const email = args.email.trim().toLowerCase();

  // Une adresse deja prise appartient peut-etre a un abonne : on ne la
  // transforme pas en compte d'administration en silence.
  const existant = await prisma.utilisateur.findUnique({
    where: { email },
    select: { role: true },
  });
  if (existant) {
    console.error(
      `L'adresse ${email} est déjà utilisée par un compte ${existant.role}.`,
    );
    process.exit(1);
  }

  const motDePasse = args.motdepasse?.trim() || motDePasseAleatoire();
  if (!motDePasseValide(motDePasse)) {
    console.error(
      "Le mot de passe doit faire 8 caractères minimum et contenir au moins une lettre et un chiffre.",
    );
    process.exit(1);
  }

  await prisma.utilisateur.create({
    data: {
      email,
      motDePasse: await bcrypt.hash(motDePasse, BCRYPT_ROUNDS),
      role: "SUPERVISEUR",
      nom: args.nom.trim(),
      prenom: args.prenom.trim(),
      telephone: args.telephone.trim(),
      statutCompte: "ACTIF",
    },
  });

  const deja = await prisma.utilisateur.count({ where: { role: "SUPERVISEUR" } });

  console.log("\n  Compte superviseur créé.\n");
  console.log(`  Adresse      : ${email}`);
  console.log(`  Mot de passe : ${motDePasse}`);
  console.log(
    args.motdepasse
      ? "\n  Changez-le après la première connexion depuis « Mon compte »."
      : "\n  Ce mot de passe ne sera plus affiché. Notez-le, puis changez-le\n  après la première connexion depuis « Mon compte ».",
  );
  if (deja > 1) {
    console.log(`\n  (${deja} comptes superviseur existent désormais.)`);
  }
  console.log();
}

main()
  .catch((erreur) => {
    console.error("La création a échoué :", erreur);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
