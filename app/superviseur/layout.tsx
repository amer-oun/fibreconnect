import CoquilleApp from "@/components/navigation/coquille-app";
import { exigerRole } from "@/lib/session";

export default async function LayoutSuperviseur({
  children,
}: {
  children: React.ReactNode;
}) {
  const utilisateur = await exigerRole("SUPERVISEUR");
  return <CoquilleApp utilisateur={utilisateur}>{children}</CoquilleApp>;
}
