import EspaceProvisoire from "@/components/espace-provisoire";
import { exigerRole } from "@/lib/session";

export default async function TableauDeBordSuperviseur() {
  const utilisateur = await exigerRole("SUPERVISEUR");
  return <EspaceProvisoire utilisateur={utilisateur} />;
}
