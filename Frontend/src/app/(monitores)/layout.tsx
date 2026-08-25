import { AccessGuard } from "@/features/auth/components/AccessGuard";
import { MarcoMonitores } from "@/features/monitores/componentes/MarcoMonitores";

export default function DisposicionMonitores({ children }: Readonly<{ children:React.ReactNode }>) {
  return <AccessGuard application="monitores"><MarcoMonitores>{children}</MarcoMonitores></AccessGuard>;
}
