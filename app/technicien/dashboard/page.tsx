import EspaceProvisoire from "@/components/espace-provisoire";
import { exigerRole } from "@/lib/session";

export default async function TableauDeBordTechnicien() {
  const utilisateur = await exigerRole("TECHNICIEN");
  return <EspaceProvisoire utilisateur={utilisateur} />;
}
