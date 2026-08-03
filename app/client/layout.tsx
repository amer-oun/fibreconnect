import CoquilleApp from "@/components/navigation/coquille-app";
import { exigerRole } from "@/lib/session";

export default async function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const utilisateur = await exigerRole("CLIENT");
  return <CoquilleApp utilisateur={utilisateur}>{children}</CoquilleApp>;
}
