import { LoginView } from "@/features/auth/components/LoginView";
import { Suspense } from "react";

export default function LoginPage() {
  return <Suspense fallback={<main className="auth-page" aria-label="Cargando acceso" />}><LoginView /></Suspense>;
}
