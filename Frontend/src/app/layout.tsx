import type { Metadata, Viewport } from "next";
import { ToastNotifications } from "@/components/feedback/ToastNotifications";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Sistema de Gestión Operativa",
  description: "Gestión de Aulas de Software",
  icons: {
    icon: "/brand/Logo_Cosmos_Base.png",
    shortcut: "/brand/Logo_Cosmos_Base.png",
  },
};

const themeBootScript = `try{document.documentElement.dataset.theme=localStorage.getItem("sgoas-theme")==="dark"?"dark":"light"}catch{}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head><body>{children}<ToastNotifications /></body></html>;
}
