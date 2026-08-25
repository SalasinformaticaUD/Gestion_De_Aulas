export type ThemePreference = "light" | "dark";

export type UserProfile = {
  fullName: string;
  email: string;
  username: string;
  role: string;
  department: string;
  photo?: string;
};

export const defaultProfile: UserProfile = {
  fullName: "Jhon Rodríguez",
  email: "jrodriguez@udistrital.edu.co",
  username: "jrodriguez",
  role: "Técnico · Almacén",
  department: "Aulas de Software",
};

const profileKey = "sgoas-user-profile";
const themeKey = "sgoas-theme";
export const profileEvent = "sgoas-profile-updated";
export const themeEvent = "sgoas-theme-updated";

export function loadProfile(): UserProfile {
  const value = window.localStorage.getItem(profileKey);
  if (!value) return defaultProfile;
  try { return { ...defaultProfile, ...JSON.parse(value) as Partial<UserProfile> }; }
  catch { return defaultProfile; }
}

export function saveProfile(profile: UserProfile) {
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
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
