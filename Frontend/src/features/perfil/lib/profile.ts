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

// Las preferencias se guardan por usuario. La identidad siempre procede de
// la sesión autenticada, nunca de localStorage.
const profileKeyPrefix = "sgoas-user-profile-v3";
const themeKey = "sgoas-theme";
export const profileEvent = "sgoas-profile-updated";
export const themeEvent = "sgoas-theme-updated";

function profileKey(userId: string) {
  return `${profileKeyPrefix}:${userId}`;
}

export function loadProfile(userId?: string): UserProfile {
  if (!userId) return defaultProfile;
  const value = window.localStorage.getItem(profileKey(userId));
  if (!value) return defaultProfile;
  try {
    const stored = JSON.parse(value) as Pick<UserProfile, "photo">;
    return { ...defaultProfile, photo: typeof stored.photo === "string" ? stored.photo : undefined };
  } catch {
    return defaultProfile;
  }
}

export function profileFromSession(user: AuthenticatedProfileUser, preferences = loadProfile(user.id)): UserProfile {
  const role = user.cargo?.trim() || user.roles.filter(Boolean).join(", ") || "Sin cargo asignado";
  return {
    fullName: user.nombreCompleto,
    email: user.correo,
    username: user.nombreUsuario,
    role,
    department: user.dependencia?.nombre ?? "Sin dependencia",
    photo: preferences.photo,
  };
}

export function saveProfile(userId: string, profile: UserProfile) {
  window.localStorage.setItem(profileKey(userId), JSON.stringify({ photo: profile.photo }));
  window.dispatchEvent(new CustomEvent(profileEvent));
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
