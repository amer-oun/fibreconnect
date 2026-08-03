import { ROLE_LABELS, type Role } from "@/lib/constants";
import BoutonDeconnexion from "@/components/bouton-deconnexion";

/**
 * Placeholder shown by the three dashboards until each space is built
 * (steps 7, 8 and 9). Its only job is to prove that authentication and
 * role-based routing work.
 */
export default function EspaceProvisoire({
  utilisateur,
}: {
  utilisateur: { prenom: string; nom: string; email: string; role: Role };
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="rounded-lg border border-slate-200 bg-white p-8">
        <p className="text-sm font-medium tracking-wide text-signal uppercase">
          {ROLE_LABELS[utilisateur.role]}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-nuit">
          Bonjour {utilisateur.prenom} {utilisateur.nom}
        </h1>
        <p className="mt-2 text-ardoise">
          Vous êtes connecté avec l’adresse {utilisateur.email}.
        </p>
        <p className="mt-6 rounded-md border border-slate-200 bg-ivoire px-4 py-3 text-sm text-ardoise">
          Cet espace sera construit dans une prochaine étape du projet.
        </p>
        <div className="mt-8">
          <BoutonDeconnexion />
        </div>
      </div>
    </main>
  );
}
