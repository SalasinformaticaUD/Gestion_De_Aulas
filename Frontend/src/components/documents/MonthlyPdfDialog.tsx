"use client";

import { useState } from "react";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions(firstMonth: string, lastMonth: string) {
  const [firstYear, firstMonthNumber] = firstMonth.split("-").map(Number);
  const [lastYear, lastMonthNumber] = lastMonth.split("-").map(Number);
  const first = new Date(firstYear, firstMonthNumber - 1, 1);
  const last = new Date(lastYear, lastMonthNumber - 1, 1);
  if (Number.isNaN(first.getTime()) || first > last) return [{ value: lastMonth, label: lastMonth }];
  const formatter = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" });
  const options: Array<{ value: string; label: string }> = [];
  for (const cursor = first; cursor <= last; cursor.setMonth(cursor.getMonth() + 1)) {
    const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = formatter.format(cursor);
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options.reverse();
}

export function MonthlyPdfDialog({ title, description, onClose, onGenerate, actionLabel = "Generar fichas PDF", fieldLabel = "Mes de las fichas", firstMonth = "2026-09" }: { title: string; description: string; onClose: () => void; onGenerate: (month: string) => Promise<void>; actionLabel?: string; fieldLabel?: string; firstMonth?: string }) {
  const maximumMonth = currentMonth();
  const options = monthOptions(firstMonth, maximumMonth);
  const [month, setMonth] = useState(options[0]?.value ?? maximumMonth);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="monthly-pdf-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="monthly-pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="monthly-pdf-title"><header><div><span>GENERACIÓN DOCUMENTAL</span><h2 id="monthly-pdf-title">{title}</h2><p>{description}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={async (event) => { event.preventDefault(); setGenerating(true); setError(null); try { await onGenerate(month); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible generar el archivo."); } finally { setGenerating(false); } }}><label><span>{fieldLabel}</span><select value={month} onChange={(event) => setMonth(event.target.value)} required>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>Para el mes actual solo se incluyen registros hasta hoy.</small></label>{error && <p className="monthly-pdf-error" role="alert">{error}</p>}<footer><button type="button" className="button-secondary" onClick={onClose} disabled={generating}>Cancelar</button><button type="submit" className="button-primary" disabled={generating || !month}>{generating ? "Generando…" : actionLabel}</button></footer></form></section></div>;
}
