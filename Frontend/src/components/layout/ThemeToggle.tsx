"use client";

import { useEffect, useState } from "react";
import { applyTheme, loadTheme, themeEvent, type ThemePreference } from "@/features/perfil/lib/profile";

function temaActivo(): ThemePreference {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>("light");
  useEffect(() => {
    const sincronizar = () => setTheme(temaActivo());
    sincronizar();
    window.addEventListener(themeEvent, sincronizar);
    return () => window.removeEventListener(themeEvent, sincronizar);
  }, []);
  const alternar = () => {
    const siguiente: ThemePreference = temaActivo() === "dark" ? "light" : "dark";
    applyTheme(siguiente);
    setTheme(siguiente);
  };
  const dark = theme === "dark";
  return <button type="button" className="theme-toggle" aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"} aria-pressed={dark} title={dark ? "Activar modo claro" : "Activar modo oscuro"} onClick={alternar}><span aria-hidden="true">{dark ? "☀" : "☾"}</span></button>;
}