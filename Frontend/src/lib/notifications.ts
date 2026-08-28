export type NotificationTone = "error" | "success" | "info";

export type NotificationDetail = {
  message: string;
  tone?: NotificationTone;
};

export const notificationEvent = "sgoas:notification";

export function notify({ message, tone = "info" }: NotificationDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NotificationDetail>(notificationEvent, { detail: { message, tone } }));
}
