import CoquilleApp from "@/components/navigation/coquille-app";
import { exigerRole } from "@/lib/session";

export default async function LayoutTechnicien({
  children,
}: {
  children: React.ReactNode;
}) {
  const utilisateur = await exigerRole("TECHNICIEN");
  return <CoquilleApp utilisateur={utilisateur}>{children}</CoquilleApp>;
}
