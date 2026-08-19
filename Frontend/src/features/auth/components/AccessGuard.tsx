"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { ApplicationKey } from "@/features/auth/config/applications";
import { getDemoSession } from "@/features/auth/lib/session";

type AccessGuardProps = { application: ApplicationKey; children: ReactNode };

export function AccessGuard({ application, children }: AccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  useEffect(() => {
    const session = getDemoSession();
    if (session?.application === application) { setIsAllowed(true); return; }
    router.replace(`/login?app=${application}&next=${encodeURIComponent(pathname)}`);
  }, [application, pathname, router]);
  return isAllowed ? <>{children}</> : <main className="access-guard-loading">Verificando acceso...</main>;
}
