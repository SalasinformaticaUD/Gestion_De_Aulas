"use client";
import { useEffect, useState } from "react";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
type Tipo = "memorandos" | "actas";
type Fila = Record<string, unknown>;
export function ReportesApiView({ tipo }: { tipo: Tipo }) {
  const [rows, setRows] = useState<Fila[]>([]); const [error, setError] = useState("");
  useEffect(() => { void (tipo === "memorandos" ? servicioMonitores.listarMemorandos() : servicioMonitores.listarActasCompromiso()).then((data) => setRows(data as Fila[])).catch((e) => setError(e instanceof Error ? e.message : "No fue posible cargar los documentos.")); }, [tipo]);
  const descargar = async (row: Fila) => { try { const blob = tipo === "memorandos" ? await servicioMonitores.descargarMemorando(String(row.id)) : await servicioMonitores.descargarActaCompromiso(String(row.monitor)); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${tipo}-${String(row.id ?? row.monitor)}.pdf`; a.click(); URL.revokeObjectURL(url); } catch (e) { setError(e instanceof Error ? e.message : "No fue posible descargar el PDF."); } };
  const reenviar = async (row: Fila) => { try { await servicioMonitores.reenviarMemorando(String(row.id)); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "No fue posible reenviar el memorando."); } };
  return <><section className="page-heading"><div><span>Gestión documental</span><h1>{tipo === "memorandos" ? "Memorandos" : "Actas de compromiso"}</h1><p>Documentos consultados directamente desde la API de Monitores.</p></div></section>{error && <div role="alert">{error}</div>}<section className="card"><table><thead><tr><th>Monitor</th><th>Código</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>{rows.map((row) => <tr key={String(row.id ?? row.monitor)}><td>{String(row.monitor_name ?? "—")}</td><td>{String(row.codigo_estudiante ?? "—")}</td><td>{tipo === "memorandos" ? (row.sent_at ? "Enviado" : "Pendiente") : (row.has_signed ? "Firmada" : "Pendiente")}</td><td>{String(row.sent_at ?? row.uploaded_at ?? "—")}</td><td><button type="button" onClick={() => void descargar(row)}>Descargar PDF</button>{tipo === "memorandos" && <button type="button" onClick={() => void reenviar(row)}>Reenviar</button>}</td></tr>)}</tbody></table></section></>;
}
