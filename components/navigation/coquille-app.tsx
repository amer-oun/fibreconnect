import type { ReactNode } from "react";

import { ROLE_LABELS, type Role } from "@/lib/constants";
import { notificationsPour } from "@/lib/notifications";
import ClocheNotifications from "@/components/navigation/cloche-notifications";
import BoutonDeconnexionCompact from "@/components/navigation/bouton-deconnexion";
import MenuCompte from "@/components/navigation/menu-compte";
import { Marque } from "@/components/navigation/marque";
import { LienLateral, LienMobile, type EntreeNav } from "@/components/navigation/lien-nav";

/**
 * Application shell shared by the three spaces.
 *
 * Wide screens get a dark left rail; the active entry is marked by a cyan
 * left edge — a lit fibre. On a phone the rail becomes a bottom tab bar so
 * a technician can reach it with a thumb while standing at a junction box.
 */

export const NAVIGATION: Record<Role, EntreeNav[]> = {
  CLIENT: [
    { libelle: "Mes demandes", abrege: "Demandes", href: "/client/dashboard", icone: "liste" },
    { libelle: "Déclarer une panne", abrege: "Déclarer", href: "/client/nouvelle-panne", icone: "ajout" },
    { libelle: "Mon compte", abrege: "Compte", href: "/client/profil", icone: "profil" },
  ],
  TECHNICIEN: [
    { libelle: "Pannes disponibles", abrege: "Disponibles", href: "/technicien/dashboard", icone: "liste" },
    { libelle: "Mes interventions", abrege: "En cours", href: "/technicien/mes-interventions", icone: "chantier" },
    { libelle: "Ma caisse", abrege: "Caisse", href: "/technicien/caisse", icone: "caisse" },
    { libelle: "Historique", abrege: "Historique", href: "/technicien/historique", icone: "archive" },
    { libelle: "Mon profil", abrege: "Profil", href: "/technicien/profil", icone: "profil" },
  ],
  SUPERVISEUR: [
    { libelle: "Tableau de bord", abrege: "Bord", href: "/superviseur/dashboard", icone: "stats" },
    { libelle: "Interventions", abrege: "Interv.", href: "/superviseur/interventions", icone: "liste" },
    { libelle: "Finances", abrege: "Finances", href: "/superviseur/finances", icone: "caisse" },
    { libelle: "Techniciens", abrege: "Équipe", href: "/superviseur/techniciens", icone: "equipe" },
    { libelle: "Clients", abrege: "Clients", href: "/superviseur/clients", icone: "carte" },
    { libelle: "Réseaux", abrege: "Réseaux", href: "/superviseur/reseaux", icone: "reseau" },
    { libelle: "Mon compte", abrege: "Compte", href: "/superviseur/profil", icone: "profil" },
  ],
};

export default async function CoquilleApp({
  utilisateur,
  children,
}: {
  utilisateur: { id: string; prenom: string; nom: string; email: string; role: Role };
  children: ReactNode;
}) {
  const entrees = NAVIGATION[utilisateur.role];
  const notifications = await notificationsPour(utilisateur);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/*
        Premiere cible du clavier : sans elle, il faut traverser toute la
        navigation a chaque page avant d'atteindre le contenu.
      */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-net focus:bg-nuit focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-ivoire"
      >
        Aller au contenu
      </a>

      {/* Rail lateral — ecrans larges */}
      <aside className="sans-impression sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-nuit-700 bg-nuit lg:flex">
        <div className="px-4 py-5">
          <Marque href={entrees[0].href} />
        </div>

        <nav aria-label="Navigation principale" className="flex-1 py-2" id="navigation">
          {entrees.map((entree) => (
            <LienLateral key={entree.href} entree={entree} />
          ))}
        </nav>

        <MenuCompte
          prenom={utilisateur.prenom}
          nom={utilisateur.nom}
          email={utilisateur.email}
          role={ROLE_LABELS[utilisateur.role]}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre haute — commune, porte la cloche */}
        <header className="sans-impression sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-nuit-700 bg-nuit px-4 lg:h-12 lg:border-trait lg:bg-white lg:px-6">
          <div className="lg:hidden">
            <Marque href={entrees[0].href} compact />
          </div>
          <p className="hidden font-display text-xs font-semibold tracking-[0.14em] text-ardoise uppercase lg:block">
            Espace {ROLE_LABELS[utilisateur.role]}
          </p>

          <div className="flex items-center gap-1">
            {/* Sur fond sombre (mobile) puis sur fond blanc (bureau) :
                la cloche herite de la couleur de son conteneur. */}
            <div className="lg:[&_button]:text-ardoise lg:[&_button:hover]:bg-ivoire lg:[&_button:hover]:text-nuit">
              <ClocheNotifications notifications={notifications} />
            </div>
            <div className="lg:hidden">
              <BoutonDeconnexionCompact />
            </div>
          </div>
        </header>

        <main id="contenu" tabIndex={-1} className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Barre du bas — telephone */}
      <nav
        aria-label="Navigation principale, barre du bas"
        className="marge-zone-sure sans-impression fixed inset-x-0 bottom-0 z-40 flex border-t border-nuit-700 bg-nuit lg:hidden"
      >
        {entrees.map((entree) => (
          <LienMobile key={entree.href} entree={entree} />
        ))}
      </nav>
    </div>
  );
}
