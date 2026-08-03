import Link from "next/link";
import { redirect } from "next/navigation";

import { ROLE_ACCUEIL } from "@/lib/constants";
import { utilisateurConnecte } from "@/lib/session";
import { Marque } from "@/components/navigation/marque";
import TraceOtdr from "@/components/trace-otdr";
import { LienBouton } from "@/components/ui/bouton";

/**
 * Public landing page.
 *
 * Three visible doors — client, technicien, superviseur — all leading to the
 * same /login form. That is a requirement of the brief: three doors on screen,
 * a single authentication behind them.
 */

const PORTES = [
  {
    role: "Client",
    titre: "Espace client",
    phrase:
      "Déclarez une panne sur votre ligne, suivez son avancement heure par heure et notez le technicien une fois la fibre rétablie.",
    reperes: ["Déclaration en 2 minutes", "Suivi en temps réel", "Notation du technicien"],
  },
  {
    role: "Technicien",
    titre: "Espace technicien",
    phrase:
      "Consultez les pannes disponibles chez votre opérateur, acceptez celles de votre zone et rédigez votre rapport depuis le terrain.",
    reperes: ["Filtré par opérateur", "Utilisable sur mobile", "Rapport d’intervention"],
  },
  {
    role: "Superviseur",
    titre: "Espace superviseur",
    phrase:
      "Pilotez l’ensemble des équipes : affectation manuelle, historique complet par technicien, statistiques et carte des abonnés.",
    reperes: ["Affectation manuelle", "Statistiques", "Carte des clients"],
  },
];

export default async function PageAccueil() {
  // Un utilisateur deja connecte n'a rien a faire sur la page de garde.
  const utilisateur = await utilisateurConnecte();
  if (utilisateur) redirect(ROLE_ACCUEIL[utilisateur.role]);

  return (
    <div className="flex min-h-screen flex-col bg-nuit">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Marque />
        <LienBouton href="/login" variante="secondaire" taille="petit">
          Se connecter
        </LienBouton>
      </header>

      {/* Thèse de la page : une panne fibre a un point précis, et il se mesure. */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-10 pb-4 sm:pt-16">
        <p className="eyebrow text-signal">Maintenance fibre optique — Tunisie</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] font-bold tracking-tight text-ivoire sm:text-5xl lg:text-6xl">
          Une panne fibre a toujours
          <br />
          un point précis sur la ligne.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-brume">
          FibreConnect relie l’abonné qui déclare, le technicien qui intervient
          et le superviseur qui arbitre — sur une seule chaîne, du signalement
          au rétablissement.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <LienBouton href="/login" variante="signal" taille="grand">
            Accéder à mon espace
          </LienBouton>
          <LienBouton href="/register" variante="secondaire" taille="grand">
            Créer un compte client
          </LienBouton>
        </div>
      </section>

      {/* La trace OTDR : l'artefact du métier, en guise d'illustration. */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-6 pb-14">
        <figure className="rounded-bloc border border-nuit-700 bg-nuit-800/50 p-4 sm:p-6">
          <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <span className="eyebrow text-brume">
              Réflectométrie — liaison NRO → abonné
            </span>
            <span className="font-mono text-xs text-ardoise">
              atténuation 0,32 dB/km · 7,9 km
            </span>
          </figcaption>
          <TraceOtdr className="h-44 w-full sm:h-60" />
        </figure>
      </section>

      {/* Les trois portes */}
      <section aria-labelledby="titre-portes" className="border-t border-nuit-700">
        <div className="mx-auto w-full max-w-6xl px-5 py-12">
          <h2
            id="titre-portes"
            className="font-display text-sm font-semibold tracking-[0.14em] text-brume uppercase"
          >
            Trois espaces, une seule connexion
          </h2>

          <ul className="mt-7 grid gap-px overflow-hidden rounded-bloc border border-nuit-700 bg-nuit-700 md:grid-cols-3">
            {PORTES.map((porte) => (
              <li key={porte.titre} className="bg-nuit">
                <Link
                  href="/login"
                  className="group flex h-full flex-col border-l-2 border-l-transparent p-6 transition-colors duration-150 hover:border-l-signal hover:bg-nuit-800 focus-visible:border-l-signal focus-visible:bg-nuit-800"
                >
                  <p className="eyebrow text-signal">{porte.role}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-ivoire">
                    {porte.titre}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-brume">
                    {porte.phrase}
                  </p>

                  <ul className="mt-5 space-y-1.5">
                    {porte.reperes.map((repere) => (
                      <li
                        key={repere}
                        className="flex items-center gap-2 font-mono text-xs text-ardoise"
                      >
                        <span
                          aria-hidden
                          className="h-px w-3 bg-signal-profond group-hover:bg-signal"
                        />
                        {repere}
                      </li>
                    ))}
                  </ul>

                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ivoire">
                    Se connecter
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="size-4 transition-transform duration-150 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 10h12M11 5l5 5-5 5" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-auto border-t border-nuit-700">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-ardoise">
          <p>
            FibreConnect — gestion d’interventions de maintenance fibre optique.
          </p>
          <p className="font-mono">Tunisie Telecom · Ooredoo · Orange</p>
        </div>
      </footer>
    </div>
  );
}
