import type { ApplicationKey } from "@/features/auth/config/applications";

const storageKey = "cosmos-demo-session";
export type DemoSession = { application: ApplicationKey; username: string };

export function saveDemoSession(session: DemoSession) {
  window.sessionStorage.setItem(storageKey, JSON.stringify(session));
}

export function getDemoSession(): DemoSession | null {
  const savedSession = window.sessionStorage.getItem(storageKey);
  if (!savedSession) return null;
  try {
    const session = JSON.parse(savedSession) as DemoSession;
    return session.application === "aulas" || session.application === "monitores" ? session : null;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}
