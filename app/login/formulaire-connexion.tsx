"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";

import { ROLE_ACCUEIL } from "@/lib/constants";
import { ERREUR_COMPTE_DESACTIVE } from "@/lib/auth";

export default function FormulaireConnexion({
  callbackUrl,
}: {
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);

    const donnees = new FormData(evenement.currentTarget);

    // `redirect: false` : on veut choisir nous-memes la destination selon le role.
    const resultat = await signIn("credentials", {
      redirect: false,
      email: String(donnees.get("email") ?? ""),
      motDePasse: String(donnees.get("motDePasse") ?? ""),
    });

    // Attention : `resultat.ok` vaut `true` meme sur un echec, car la requete
    // HTTP reussit (200). C'est `resultat.error` qui fait foi.
    if (!resultat || resultat.error) {
      setErreur(
        resultat?.error === ERREUR_COMPTE_DESACTIVE
          ? "Ce compte a été désactivé. Contactez votre superviseur."
          : "Adresse e-mail ou mot de passe incorrect.",
      );
      setEnCours(false);
      return;
    }

    // La session vient d'etre creee : on lit le role pour aiguiller.
    const session = await getSession();
    const destination =
      callbackUrl ??
      (session?.user.role ? ROLE_ACCUEIL[session.user.role] : "/login");

    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-nuit">
          Adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="prenom.nom@exemple.tn"
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-nuit placeholder:text-ardoise/60 focus:border-signal focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="motDePasse" className="text-sm font-medium text-nuit">
          Mot de passe
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-nuit focus:border-signal focus:outline-none"
        />
      </div>

      {erreur && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-1 rounded-md bg-nuit px-4 py-2.5 font-medium text-ivoire transition-colors hover:bg-nuit-clair disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enCours ? "Connexion en cours…" : "Se connecter"}
      </button>
    </form>
  );
}
