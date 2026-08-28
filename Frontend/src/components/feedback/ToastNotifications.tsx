"use client";

import { useEffect, useState } from "react";
import { notificationEvent, type NotificationDetail, type NotificationTone } from "@/lib/notifications";

type Toast = NotificationDetail & { id: number; tone: NotificationTone };

export function ToastNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<NotificationDetail>).detail;
      if (!detail?.message) return;
      const toast: Toast = { id: Date.now(), message: detail.message, tone: detail.tone ?? "info" };
      setToasts((current) => [...current, toast].slice(-3));
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 5000);
    };
    window.addEventListener(notificationEvent, receive);
    return () => window.removeEventListener(notificationEvent, receive);
  }, []);

  return <section className="toast-region" aria-live="polite" aria-label="Notificaciones">{toasts.map((toast) => <div className={`toast toast-${toast.tone}`} key={toast.id} role={toast.tone === "error" ? "alert" : "status"}><span>{toast.message}</span><button type="button" aria-label="Cerrar notificación" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>×</button></div>)}</section>;
}
