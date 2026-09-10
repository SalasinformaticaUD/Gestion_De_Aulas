export type ThemePreference = "light" | "dark";

export type UserProfile = {
  fullName: string;
  email: string;
  username: string;
  role: string;
  department: string;
  photo?: string;
};

export type AuthenticatedProfileUser = {
  id: string;
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  fotoPerfil: string | null;
  cargo: string | null;
  dependencia: { id: string; nombre: string } | null;
  roles: string[];
};

export const defaultProfile: UserProfile = {
  fullName: "Usuario",
  email: "",
  username: "",
  role: "Sin perfil cargado",
  department: "",
};

const themeKey = "sgoas-theme";
export const themeEvent = "sgoas-theme-updated";

export function profileFromSession(user: AuthenticatedProfileUser): UserProfile {
  const role = user.cargo?.trim() || user.roles.filter(Boolean).join(", ") || "Sin cargo asignado";
  return {
    fullName: user.nombreCompleto,
    email: user.correo,
    username: user.nombreUsuario,
    role,
    department: user.dependencia?.nombre ?? "Sin dependencia",
    photo: user.fotoPerfil ?? undefined,
  };
}

export function loadTheme(): ThemePreference {
  return window.localStorage.getItem(themeKey) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(themeKey, theme);
  window.dispatchEvent(new CustomEvent(themeEvent, { detail: theme }));
}

export function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("es");
}
