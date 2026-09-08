"use client";

import { useMemo, useState } from "react";

function monthOptions() {
  const now = new Date();
  const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return [{ value, label: new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(now) }];
}

export function MonthlyPdfDialog({ title, description, onClose, onGenerate }: { title: string; description: string; onClose: () => void; onGenerate: (month: string) => Promise<void> }) {
  const options = useMemo(monthOptions, []);
  const [month, setMonth] = useState(options[0]?.value ?? "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="monthly-pdf-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="monthly-pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="monthly-pdf-title"><header><div><span>GENERACIÓN DOCUMENTAL</span><h2 id="monthly-pdf-title">{title}</h2><p>{description}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={async (event) => { event.preventDefault(); setGenerating(true); setError(null); try { await onGenerate(month); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible generar las fichas."); } finally { setGenerating(false); } }}><label><span>Mes de las fichas</span><select value={month} onChange={(event) => setMonth(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>Para el mes actual solo se incluyen registros hasta el día de hoy.</small></label>{error && <p className="monthly-pdf-error" role="alert">{error}</p>}<footer><button type="button" className="button-secondary" onClick={onClose} disabled={generating}>Cancelar</button><button type="submit" className="button-primary" disabled={generating}>{generating ? "Generando…" : "Generar fichas PDF"}</button></footer></form></section></div>;
}
