"use client";

import { useEffect, useState } from "react";
import { applyTheme, loadTheme, type ThemePreference } from "@/features/perfil/lib/profile";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>("light");
  useEffect(() => setTheme(loadTheme()), []);
  const dark = theme === "dark";
  return <button type="button" className="theme-toggle" aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"} onClick={() => { const next = dark ? "light" : "dark"; setTheme(next); applyTheme(next); }}><span aria-hidden="true">{dark ? "☀" : "☾"}</span></button>;
}
