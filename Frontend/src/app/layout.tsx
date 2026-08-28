import type { Metadata } from "next";
import { ToastNotifications } from "@/components/feedback/ToastNotifications";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Gestión Operativa",
  description: "Gestión de Aulas de Software",
};

const themeBootScript = `try{document.documentElement.dataset.theme=localStorage.getItem("sgoas-theme")==="dark"?"dark":"light"}catch{}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head><body>{children}<ToastNotifications /></body></html>;
}
