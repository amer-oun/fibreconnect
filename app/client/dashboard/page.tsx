import EspaceProvisoire from "@/components/espace-provisoire";
import { exigerRole } from "@/lib/session";

export default async function TableauDeBordClient() {
  const utilisateur = await exigerRole("CLIENT");
  return <EspaceProvisoire utilisateur={utilisateur} />;
}
