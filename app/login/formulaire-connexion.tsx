"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";

import { ROLE_ACCUEIL } from "@/lib/constants";
import { messageDErreurConnexion } from "@/lib/connexion";
import { Bouton } from "@/components/ui/bouton";
import { ChampTexte, MessageErreur } from "@/components/ui/champs";

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

    // `redirect: false` : la destination depend du role, on la choisit ici.
    const resultat = await signIn("credentials", {
      redirect: false,
      email: String(donnees.get("email") ?? "").trim(),
      motDePasse: String(donnees.get("motDePasse") ?? ""),
    });

    // Attention : `resultat.ok` vaut `true` meme sur un echec, car la requete
    // HTTP aboutit (200). C'est `resultat.error` qui fait foi.
    if (!resultat || resultat.error) {
      setErreur(messageDErreurConnexion(resultat?.error ?? ""));
      setEnCours(false);
      return;
    }

    const session = await getSession();
    const destination =
      callbackUrl ??
      (session?.user.role ? ROLE_ACCUEIL[session.user.role] : "/login");

    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5" noValidate>
      <ChampTexte
        id="email"
        label="Adresse e-mail"
        type="email"
        required
        autoComplete="email"
        autoFocus
        placeholder="prenom.nom@exemple.tn"
      />

      <ChampTexte
        id="motDePasse"
        label="Mot de passe"
        type="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}

      <Bouton type="submit" disabled={enCours} taille="grand" className="mt-1">
        {enCours ? "Connexion…" : "Se connecter"}
      </Bouton>
    </form>
  );
}
