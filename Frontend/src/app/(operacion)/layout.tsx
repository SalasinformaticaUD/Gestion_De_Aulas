import { AppShell } from "@/components/layout/AppShell";
import { AccessGuard } from "@/features/auth/components/AccessGuard";

export default function OperacionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AccessGuard application="aulas"><AppShell>{children}</AppShell></AccessGuard>;
}
