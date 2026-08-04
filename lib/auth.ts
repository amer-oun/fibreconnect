import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { estRole } from "@/lib/constants";

/** Message renvoye quand le compte existe mais a ete desactive (regle metier 6). */
export const ERREUR_COMPTE_DESACTIVE = "COMPTE_DESACTIVE";

/**
 * Haché bcrypt d'une valeur qui n'est le mot de passe de personne. Comparé
 * lorsque l'adresse e-mail est inconnue, pour que le temps de réponse ne
 * révèle pas l'existence d'un compte.
 */
const HACHE_LEURRE =
  "$2b$10$N7qk9zkqURoBuunuFsxWdOmV/kxJo.qd1K2FM.47ObQeX9RP4flhK";

const identifiantsSchema = z.object({
  email: z.email(),
  motDePasse: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  // JWT plutot que session en base : pas de table supplementaire, et le proxy
  // peut lire le role sans requete SQL.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Adresse e-mail", type: "email" },
        motDePasse: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        // Toute donnee entrante passe par zod, y compris ici.
        const resultat = identifiantsSchema.safeParse(credentials);
        if (!resultat.success) return null;

        const { email, motDePasse } = resultat.data;

        const utilisateur = await prisma.utilisateur.findUnique({
          where: { email: email.toLowerCase() },
        });

        // Compte inconnu : on compare quand meme contre un vrai haché bcrypt,
        // pour que la reponse prenne le meme temps qu'un echec de mot de passe.
        // Le haché doit etre valide : bcrypt rejette un haché malformé en une
        // fraction de milliseconde, ce qui trahirait l'absence du compte.
        if (!utilisateur) {
          await bcrypt.compare(motDePasse, HACHE_LEURRE);
          return null;
        }

        const motDePasseValide = await bcrypt.compare(
          motDePasse,
          utilisateur.motDePasse,
        );
        if (!motDePasseValide) return null;

        // Regle metier 6 : un compte desactive ne peut pas se connecter.
        if (!utilisateur.actif) {
          throw new Error(ERREUR_COMPTE_DESACTIVE);
        }

        if (!estRole(utilisateur.role)) return null;

        // Ce qui est renvoye ici alimente le JWT. Jamais le mot de passe.
        return {
          id: utilisateur.id,
          email: utilisateur.email,
          role: utilisateur.role,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
        };
      },
    }),
  ],
  callbacks: {
    // `user` n'est present qu'a la connexion : on recopie alors ses champs
    // dans le token, qui sera relu tel quel a chaque requete suivante.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.nom = user.nom;
        token.prenom = user.prenom;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.nom = token.nom;
      session.user.prenom = token.prenom;
      return session;
    },
  },
};
