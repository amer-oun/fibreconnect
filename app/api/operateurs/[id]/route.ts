import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { logoOperateurSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * Le superviseur pose ou retire le logo d'un réseau partenaire.
 *
 * Seul le logo est modifiable : le nom d'un opérateur est une clé métier —
 * changer « Ooredoo » en autre chose déplacerait silencieusement tous les
 * techniciens et abonnés qui y sont rattachés.
 */
export async function PATCH(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;
    const { logoUrl } = logoOperateurSchema.parse(await lireCorps(requete));

    const operateur = await prisma.operateur.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!operateur) {
      throw new ErreurMetier("Ce réseau n’existe pas.", 404);
    }

    await prisma.operateur.update({
      where: { id },
      data: { logoUrl: logoUrl ?? null },
    });

    return reponseOk({ id, logoUrl: logoUrl ?? null });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
