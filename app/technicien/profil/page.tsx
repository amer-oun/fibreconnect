import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { formaterDate } from "@/lib/dates";
import { EntetePage, Indicateur, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import VignetteTechnicien from "@/components/ui/vignette-technicien";
import PastilleOperateur from "@/components/ui/pastille-operateur";
import FormulaireMotDePasse from "@/components/compte/formulaire-mot-de-passe";
import FormulaireProfil from "./formulaire-profil";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilTechnicien() {
  const utilisateur = await exigerRole("TECHNICIEN");

  const technicien = await prisma.technicien.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: {
      id: true,
      matricule: true,
      specialite: true,
      zone: true,
      disponible: true,
      photoUrl: true,
      operateur: { select: { nom: true, logoUrl: true } },
      utilisateur: {
        select: {
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          creeLe: true,
        },
      },
    },
  });

  if (!technicien) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <EntetePage
          titre="Profil incomplet"
          description="Votre compte n’est rattaché à aucune fiche technicien. Contactez votre superviseur."
        />
      </div>
    );
  }

  const [terminees, notes] = await Promise.all([
    prisma.intervention.count({
      where: { technicienId: technicien.id, statut: "TERMINEE" },
    }),
    prisma.intervention.aggregate({
      where: { technicienId: technicien.id, noteClient: { not: null } },
      _avg: { noteClient: true },
      _count: { noteClient: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={technicien.operateur.nom}
        titre={`${technicien.utilisateur.prenom} ${technicien.utilisateur.nom}`}
        description="Vos informations de terrain. Le matricule et le réseau sur lequel vous êtes habilité sont gérés par votre superviseur."
        vignette={
          <VignetteTechnicien
            photoUrl={technicien.photoUrl}
            prenom={technicien.utilisateur.prenom}
            nom={technicien.utilisateur.nom}
            taille="grand"
          />
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
        <Indicateur
          libelle="Interventions terminées"
          valeur={terminees}
          accent="#16A34A"
        />
        <Indicateur
          libelle="Note moyenne"
          valeur={
            notes._avg.noteClient !== null
              ? notes._avg.noteClient.toFixed(1)
              : "—"
          }
          accent="#F59E0B"
          precision={`${notes._count.noteClient} avis`}
        />
        <Indicateur
          libelle="Dans l’équipe depuis"
          valeur={formaterDate(technicien.utilisateur.creeLe)}
        />
      </div>

      <div className="flex flex-col gap-6">
        <Panneau>
          <TitrePanneau>Informations fixes</TitrePanneau>
          <dl className="grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <dt className="eyebrow">Matricule</dt>
              <dd className="mt-1 font-mono text-sm text-nuit">
                {technicien.matricule}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Réseau habilité</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-nuit">
                <PastilleOperateur
                  nom={technicien.operateur.nom}
                  logoUrl={technicien.operateur.logoUrl}
                  taille="petit"
                />
                {technicien.operateur.nom}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Adresse e-mail</dt>
              <dd className="mt-1 truncate font-mono text-sm text-nuit">
                {technicien.utilisateur.email}
              </dd>
            </div>
          </dl>
        </Panneau>

        <Panneau accent>
          <TitrePanneau>Ce que vous pouvez modifier</TitrePanneau>
          <FormulaireProfil
            valeurs={{
              telephone: technicien.utilisateur.telephone,
              specialite: technicien.specialite,
              zone: technicien.zone,
              disponible: technicien.disponible,
              photoUrl: technicien.photoUrl,
            }}
          />
        </Panneau>

        <Panneau>
          <TitrePanneau>Sécurité</TitrePanneau>
          <FormulaireMotDePasse />
        </Panneau>
      </div>
    </div>
  );
}
