"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { anularMulta, buscarEstudiante, buscarMultasMasivo, cargarMultasExcel, cargarMultasPaginadas, crearMotivoMulta, crearMulta, cumplirMulta, type BulkFineSearchResult, type PaginaMultas, type ResultadoCargaMultas } from "@/features/multas/api/multasApi";
import type { FineReason, FineRecord, FineStatus, FineStudent } from "@/features/multas/types";
import styles from "./FinesView.module.css";

type View = "activas" | "historial" | "motivos";
const statusLabels: Record<FineStatus, string> = { ACTIVA: "Activa", CUMPLIDA: "Cumplida", ANULADA: "Anulada" };

export function FinesView() {
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [reasons, setReasons] = useState<FineReason[]>([]);
  const [view, setView] = useState<View>("activas");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginaMultas["meta"]>({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<PaginaMultas["summary"]>({ activa: 0, cumplida: 0, anulada: 0 });
  const [statusFilter, setStatusFilter] = useState("todas");
  const [showCreate, setShowCreate] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [transition, setTransition] = useState<{ item: FineRecord; action: "cumplir" | "anular" } | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [prefillCode, setPrefillCode] = useState("");
  const [prefillReason, setPrefillReason] = useState("");
  const [prefillDescription, setPrefillDescription] = useState("");
  const [prefillPracticeId, setPrefillPracticeId] = useState("");
  const [prefillSuggestedFine, setPrefillSuggestedFine] = useState("");
  const [showLoad, setShowLoad] = useState(false);
  const [showBulkSearch, setShowBulkSearch] = useState(false);
  const [bulkSearchResult, setBulkSearchResult] = useState<BulkFineSearchResult | null>(null);
  const [loadResult, setLoadResult] = useState<ResultadoCargaMultas | null>(null);
  const cache = useRef(new Map<string, PaginaMultas>());

  const reload = useCallback(async (targetPage = page, force = false, targetView: View = view) => { try {
    const scope = targetView === "historial" ? "historial" : "activas";
    const key = `${scope}:${statusFilter}:${query.trim().toLocaleLowerCase("es")}:${targetPage}`;
    const data = !force && cache.current.get(key) || await cargarMultasPaginadas(targetPage, { query, scope, status: statusFilter });
    if (!cache.current.has(key) || force) cache.current.set(key, data);
    setFines(data.fines); setReasons(data.reasons); setMeta(data.meta); setSummary(data.summary);
  } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible cargar las multas." }); } }, [page, query, statusFilter, view]);
  useEffect(() => { if (view !== "motivos") void reload(); }, [reload, view]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("codigoEstudiante");
    if (code) {
      setPrefillCode(code);
      setPrefillReason(params.get("motivo") ?? "");
      setPrefillDescription(params.get("descripcion") ?? "");
      setPrefillPracticeId(params.get("practicaId") ?? "");
      setPrefillSuggestedFine("");
      setShowCreate(true);
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, []);
  const createFine = async (payload: { student: FineStudent; reasonId: string; description?: string; suggestedFine: string; practiceId?: string }) => {
    try { await crearMulta({ codigoEstudiante: payload.student.code, motivoId: payload.reasonId, descripcion: payload.description, multaSugerida: payload.suggestedFine, practicaId: payload.practiceId }); cache.current.clear(); await reload(1, true, "activas"); setPage(1); setShowCreate(false); setPrefillCode(""); setPrefillReason(""); setPrefillDescription(""); setPrefillPracticeId(""); setPrefillSuggestedFine(""); setView("activas"); setNotice({ tone: "success", text: `Multa impuesta a ${payload.student.name}.` }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible crear la multa." }); }
  };

  const completeTransition = async (item: FineRecord, action: "cumplir" | "anular", detail: string) => {
    if (item.status !== "ACTIVA") {
      setNotice({ tone: "error", text: "Solo una multa activa puede cumplirse o anularse." });
      return;
    }
    try { if (action === "cumplir") await cumplirMulta(item.id, detail); else await anularMulta(item.id, detail); cache.current.clear(); await reload(page, true); setTransition(null); setNotice({ tone: "success", text: `${item.folio} fue marcada como ${action === "cumplir" ? "cumplida" : "anulada"}.` }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible actualizar la multa." }); }
  };

  const createReason = async (payload: Omit<FineReason, "id">) => {
    try { await crearMotivoMulta(payload); cache.current.clear(); await reload(page, true); setShowReason(false); setNotice({ tone: "success", text: `El motivo “${payload.name}” fue creado correctamente.` }); return true; } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible crear el motivo." }); return false; }
  };

  const changeView = (next: View) => { setView(next); setStatusFilter("todas"); setPage(1); };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Multas</h1><p>Registro, cumplimiento y anulación de restricciones aplicadas a estudiantes.</p></div><div className={styles.actions}><button type="button" className={styles.saveButton} onClick={() => downloadFines(fines, reasons)}>Guardar multas</button><button type="button" className={styles.loadButton} onClick={() => { setLoadResult(null); setShowLoad(true); }}>Cargar multas</button><button type="button" className={styles.saveButton} onClick={() => { setBulkSearchResult(null); setShowBulkSearch(true); }}>Buscar multas masivamente</button><button type="button" className="button-primary" onClick={() => { setPrefillCode(""); setPrefillReason(""); setPrefillDescription(""); setPrefillPracticeId(""); setPrefillSuggestedFine(""); setShowCreate(true); }}>+ Nueva multa</button></div></section>

    <section className={styles.metrics} aria-label="Resumen de multas">
      <Metric label="Activas" value={summary.activa} detail="Bloquean prácticas libres" tone="red" />
      <Metric label="Cumplidas" value={summary.cumplida} detail="Compromisos verificados" tone="green" />
      <Metric label="Anuladas" value={summary.anulada} detail="Cierres administrativos" tone="neutral" />
      <Metric label="Motivos" value={reasons.length} detail="Catálogo disponible" tone="blue" />
    </section>

    {notice && <div className={`${styles.notice} ${notice.tone === "error" ? styles.noticeError : ""}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <div className={styles.viewTabs} role="tablist" aria-label="Vistas de multas"><button type="button" role="tab" aria-selected={view === "activas"} className={view === "activas" ? styles.activeTab : ""} onClick={() => changeView("activas")}>Multas activas <span>{summary.activa}</span></button><button type="button" role="tab" aria-selected={view === "historial"} className={view === "historial" ? styles.activeTab : ""} onClick={() => changeView("historial")}>Historial <span>{summary.cumplida + summary.anulada}</span></button><button type="button" role="tab" aria-selected={view === "motivos"} className={view === "motivos" ? styles.activeTab : ""} onClick={() => changeView("motivos")}>Motivos <span>{reasons.length}</span></button></div>

    {view !== "motivos" ? <section className={styles.contentCard}><header className={styles.cardHeader}><div><h2>{view === "activas" ? "Restricciones vigentes" : "Trazabilidad de multas"}</h2><p>{view === "activas" ? "Estos estudiantes no pueden registrar prácticas libres." : "Registros cumplidos o anulados, conservados sin eliminación física."}</p></div><span>{meta.total} registro(s)</span></header><div className={styles.toolbar}><label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar estudiante, código, motivo o folio..." aria-label="Buscar multas" /></label>{view === "historial" && <label><span>Estado</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="todas">Todos</option><option value="CUMPLIDA">Cumplidas</option><option value="ANULADA">Anuladas</option></select></label>}<span className={styles.resultCount}>{meta.total} resultado(s)</span></div><div className="table-wrap"><table className={styles.finesTable}><thead><tr><th>Multa</th><th>Estudiante</th><th>Motivo</th><th>Fecha</th><th>Descripción</th><th>Multa sugerida</th><th>Estado</th><th>{view === "activas" ? "Acciones" : "Resolución"}</th></tr></thead><tbody>{fines.map((fine) => <FineRow key={fine.id} fine={fine} reason={reasons.find((reason) => reason.id === fine.reasonId)} onFulfill={() => setTransition({ item: fine, action: "cumplir" })} onAnnul={() => setTransition({ item: fine, action: "anular" })} />)}{fines.length === 0 && <tr><td colSpan={8} className={styles.emptyTable}>No hay multas para los filtros seleccionados.</td></tr>}</tbody></table></div><footer className={styles.pagination}><span>Página {meta.page} de {meta.totalPages || 1}</span><div><button type="button" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>Anterior</button><button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>Siguiente</button></div></footer></section> : <ReasonsView reasons={reasons} fines={fines} onCreate={() => setShowReason(true)} />}

    
    {showCreate && <CreateFineDialog reasons={reasons} initialCode={prefillCode} initialReason={prefillReason} initialDescription={prefillDescription} initialPracticeId={prefillPracticeId} initialSuggestedFine={prefillSuggestedFine} onClose={() => { setShowCreate(false); setPrefillCode(""); setPrefillReason(""); setPrefillDescription(""); setPrefillPracticeId(""); setPrefillSuggestedFine(""); }} onCreate={createFine} />}
    {transition && <TransitionDialog item={transition.item} action={transition.action} onClose={() => setTransition(null)} onConfirm={completeTransition} />}
    {showReason && <ReasonDialog onClose={() => setShowReason(false)} onCreate={createReason} />}
    {showLoad && !loadResult && <LoadFinesDialog onClose={() => setShowLoad(false)} onResult={setLoadResult} />}
    {showBulkSearch && !bulkSearchResult && <BulkFineSearchDialog onClose={() => setShowBulkSearch(false)} onResult={setBulkSearchResult} />}
    {bulkSearchResult && <BulkFineSearchResultDialog result={bulkSearchResult} onClose={() => { setBulkSearchResult(null); setShowBulkSearch(false); }} />}
    {loadResult && <LoadFinesResultDialog result={loadResult} onClose={() => { cache.current.clear(); setPage(1); setLoadResult(null); setShowLoad(false); void reload(1, true); }} />}
  </>;
}

function downloadFines(fines: FineRecord[], reasons: FineReason[]) {
  const sheet = XLSX.utils.json_to_sheet(fines.map((fine) => ({ Multa: fine.folio, Estudiante: `${fine.student.code} - ${fine.student.name}`, Motivo: reasons.find((reason) => reason.id === fine.reasonId)?.name ?? "", Fecha: fine.date, Descripción: fine.description ?? "", "Multa sugerida": fine.suggestedFine ?? "", Estado: fine.status })));
  sheet['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 34 }, { wch: 25 }, { wch: 55 }, { wch: 32 }, { wch: 16 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Multas");
  XLSX.writeFile(book, "multas.xlsx");
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function FineRow({ fine, reason, onFulfill, onAnnul }: { fine: FineRecord; reason?: FineReason; onFulfill: () => void; onAnnul: () => void }) {
  return <tr><td><strong className={styles.folio}>{fine.folio}</strong><small>Impuesta por {fine.imposedBy ?? "Sistema"}</small></td><td><strong>{fine.student.name}</strong><small>Código {fine.student.code}</small></td><td><span className={styles.reason}>{reason?.name ?? "Motivo no disponible"}</span></td><td><time>{formatDate(fine.date)}</time></td><td><span className={styles.description}>{fine.description || "Sin descripción adicional"}</span></td><td><span className={styles.description}>{fine.suggestedFine || "Sin sugerencia registrada"}</span></td><td><StatusBadge status={fine.status} /></td><td>{fine.status === "ACTIVA" ? <div className={styles.actions}><button type="button" className={styles.fulfillButton} onClick={onFulfill}>Cumplir</button><button type="button" className={styles.annulButton} onClick={onAnnul}>Anular</button></div> : <details className={styles.resolution}><summary>Ver resolución</summary><div><strong>{fine.status === "CUMPLIDA" ? "Elementos entregados" : "Motivo de anulación"}</strong><p>{fine.status === "CUMPLIDA" ? fine.deliveredItems : fine.annulmentReason}</p><small>{fine.status === "CUMPLIDA" ? `Cumplida por ${fine.fulfilledBy} · ${formatDate(fine.fulfilledAt!)}` : `Anulada por ${fine.annulledBy} · ${formatDate(fine.annulledAt!)}`}</small></div></details>}</td></tr>;
}

function StatusBadge({ status }: { status: FineStatus }) {
  return <span className={`${styles.status} ${styles[`status_${status.toLocaleLowerCase()}`]}`}><i />{statusLabels[status]}</span>;
}

function ReasonsView({ reasons, fines, onCreate }: { reasons: FineReason[]; fines: FineRecord[]; onCreate: () => void }) {
  return <section className={styles.reasonsCard}><header><div><h2>Motivos de multa</h2><p>Catálogo utilizado para clasificar nuevas restricciones.</p></div><button type="button" className="button-primary" onClick={onCreate}>+ Nuevo motivo</button></header><div className={styles.reasonGrid}>{reasons.map((reason) => <article key={reason.id}><header><span>{fines.filter((fine) => fine.reasonId === reason.id).length}</span><strong>{reason.name}</strong></header><p>{reason.description || "Sin descripción registrada."}</p><footer>{fines.filter((fine) => fine.reasonId === reason.id && fine.status === "ACTIVA").length} multa(s) activa(s)</footer></article>)}</div></section>;
}

function CreateFineDialog({ reasons, initialCode, initialReason, initialDescription, initialPracticeId, initialSuggestedFine, onClose, onCreate }: { reasons: FineReason[]; initialCode?: string; initialReason?: string; initialDescription?: string; initialPracticeId?: string; initialSuggestedFine?: string; onClose: () => void; onCreate: (payload: { student: FineStudent; reasonId: string; description?: string; suggestedFine: string; practiceId?: string }) => void | Promise<void> }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [student, setStudent] = useState<FineStudent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reasonId, setReasonId] = useState(reasons[0]?.id ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [multaSugerida, setMultaSugerida] = useState(initialSuggestedFine ?? "");
  const lookup = async () => { try { const found = await buscarEstudiante(code.trim()); setStudent(found); setNotFound(!found); } catch { setStudent(null); setNotFound(true); } };
  useEffect(() => { if (initialCode?.trim()) void lookup(); }, [initialCode]);
  useEffect(() => {
    if (!reasons.length) return;
    const seleccionado = initialReason ? reasons.find((reason) => reason.name === initialReason) : undefined;
    setReasonId((actual) => seleccionado?.id ?? (actual || reasons[0].id));
  }, [initialReason, reasons]);
  const practiceId = initialPracticeId || student?.activePracticeId;
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (student && reasonId && practiceId && multaSugerida.trim()) void onCreate({ student, reasonId, description: description.trim() || undefined, suggestedFine: multaSugerida.trim(), practiceId }); };
  return <DialogShell title="Nueva multa" subtitle="Restricción estudiantil" description={initialCode ? "Estudiante seleccionado desde la práctica libre." : "Identifique un estudiante con práctica libre activa y seleccione el motivo."} onClose={onClose}><form onSubmit={submit}>{initialCode ? <div className={styles.studentResult}>{student ? <><b>✓</b><span><strong>{student.name}</strong><small>Código {student.code} · Estudiante seleccionado</small></span></> : <span>Validando estudiante seleccionado…</span>}</div> : <><div className={styles.studentLookup}><label><span>Código estudiantil</span><input value={code} onChange={(event) => { setCode(event.target.value); setStudent(null); setNotFound(false); }} minLength={3} maxLength={30} required autoFocus placeholder="Ej. 2021102044" /></label><button type="button" onClick={lookup} disabled={code.trim().length < 3}>Buscar</button></div>{student && <div className={styles.studentResult}><b>{student.activePracticeId ? "✓" : "!"}</b><span><strong>{student.name}</strong><small>{student.activePracticeId ? `Práctica activa en ${student.activePracticeRoom ?? "aula asignada"}` : "No tiene una práctica libre activa"}</small></span></div>}{notFound && <div className={styles.inlineError}>El estudiante no existe.</div>}</>}<div className={styles.formGrid}><label className={styles.wideField}><span>Motivo</span><select value={reasonId} onChange={(event) => setReasonId(event.target.value)}>{reasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}</select></label><label className={styles.wideField}><span>Descripción <small>Opcional · {description.length}/2000</small></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={5} placeholder="Detalle las circunstancias de la multa..." /></label><label className={styles.wideField}><span>Multa sugerida *</span><textarea required value={multaSugerida} onChange={(event) => setMultaSugerida(event.target.value)} maxLength={160} rows={2} /></label></div><div className={styles.blockWarning}><strong>Esta acción bloqueará las prácticas libres</strong><span>La restricción permanecerá hasta registrar cumplimiento o anulación.</span></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!student || !reasonId || !practiceId || !multaSugerida.trim()}>Imponer multa</button></footer></form></DialogShell>;
}

function BulkFineSearchDialog({ onClose, onResult }: { onClose: () => void; onResult: (result: BulkFineSearchResult) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const downloadTemplate = () => { const sheet = XLSX.utils.aoa_to_sheet([["Codigo"]]); sheet['!cols'] = [{ wch: 22 }]; const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Codigos"); XLSX.writeFile(book, "plantilla-busqueda-masiva-multas.xlsx"); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!file) return; if (!/\.(xlsx|xls)$/i.test(file.name)) { setError("Seleccione un archivo Excel .xlsx o .xls."); return; } setLoading(true); setError(null); try { onResult(await buscarMultasMasivo(file)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible realizar la búsqueda."); } finally { setLoading(false); } };
  return <DialogShell title="Búsqueda masiva de multas" subtitle="Consulta desde Excel" description="Cargue una plantilla con una única columna llamada Codigo. No se modifica ningún registro." onClose={onClose}><form onSubmit={(event) => void submit(event)}><div className={styles.formGrid}><label className={styles.wideField}><span>Archivo Excel</span><input type="file" accept=".xlsx,.xls" required onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null); }} /></label></div>{file && <p className={styles.studentResult}>{file.name}</p>}{error && <p className={styles.inlineError}>{error}</p>}<div className={styles.blockWarning}><strong>Formato requerido</strong><span>La primera fila debe contener únicamente la columna: Codigo.</span></div><footer><button type="button" className={styles.dialogCancel} onClick={downloadTemplate} disabled={loading}>Descargar plantilla</button><button type="button" className={styles.dialogCancel} onClick={onClose} disabled={loading}>Cancelar</button><button type="submit" className="button-primary" disabled={!file || loading}>{loading ? "Consultando…" : "Buscar multas"}</button></footer></form></DialogShell>;
}

function BulkFineSearchResultDialog({ result, onClose }: { result: BulkFineSearchResult; onClose: () => void }) {
  const [filter, setFilter] = useState<"CON_MULTA" | "SIN_MULTA" | "NO_ENCONTRADO" | null>(null);
  const visibleResults = filter ? result.resultados.filter((item) => item.estado === filter) : result.resultados;
  const selectFilter = (next: "CON_MULTA" | "SIN_MULTA" | "NO_ENCONTRADO") => setFilter((current) => current === next ? null : next);
  return <DialogShell title="Resultado de búsqueda masiva" subtitle={result.conMulta ? "Se encontraron estudiantes con multa" : "No hay estudiantes con multa"} description={`${result.procesadas} código(s) consultado(s).`} onClose={onClose}><div className={styles.loadResultContent}><div className={styles.bulkSummary}><button type="button" className={filter === "CON_MULTA" ? styles.bulkFilterActive : ""} onClick={() => selectFilter("CON_MULTA")} aria-pressed={filter === "CON_MULTA"}><strong>{result.conMulta}</strong>Con multa</button><button type="button" className={filter === "SIN_MULTA" ? styles.bulkFilterActive : ""} onClick={() => selectFilter("SIN_MULTA")} aria-pressed={filter === "SIN_MULTA"}><strong>{result.sinMulta}</strong>Sin multa</button><button type="button" className={filter === "NO_ENCONTRADO" ? styles.bulkFilterActive : ""} onClick={() => selectFilter("NO_ENCONTRADO")} aria-pressed={filter === "NO_ENCONTRADO"}><strong>{result.noEncontradas}</strong>No encontrados</button></div><div className={styles.bulkSearchList}>{visibleResults.map((item) => <article key={item.codigo} className={item.estado === "CON_MULTA" ? styles.bulkFineFound : ""}><strong>{item.codigo} · {item.nombre ?? "Estudiante no registrado"}</strong><span>{item.estado === "CON_MULTA" ? `Tiene ${item.multas.length} multa(s): ${item.multas.map((multa) => multa.motivo.nombre).join(", ")}` : item.estado === "SIN_MULTA" ? "No tiene ninguna multa." : "No existe un estudiante con este código."}</span></article>)}{!visibleResults.length && <p className={styles.emptyTable}>No hay resultados en esta categoría.</p>}</div></div><footer className={styles.loadResultFooter}><button type="button" className="button-primary" onClick={onClose}>Entendido</button></footer></DialogShell>;
}

function LoadFinesDialog({ onClose, onResult }: { onClose: () => void; onResult: (result: ResultadoCargaMultas) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) { setError("Seleccione un archivo Excel .xlsx o .xls."); return; }
    setLoading(true); setError(null);
    try { onResult(await cargarMultasExcel(file)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar las multas."); } finally { setLoading(false); }
  };
  return <DialogShell title="Cargar multas" subtitle="Importación desde Excel" description="Descargue la plantilla, reemplace la fila de ejemplo y cárguela para registrar o actualizar multas." onClose={onClose}><form onSubmit={(event) => void submit(event)}><div className={styles.formGrid}><label className={styles.wideField}><span>Archivo Excel</span><input type="file" accept=".xlsx,.xls" required onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null); }} /></label></div>{file && <p className={styles.studentResult}>{file.name}</p>}{error && <p className={styles.inlineError}>{error}</p>}<div className={styles.blockWarning}><strong>Formato requerido</strong><span>Use la plantilla: Estudiante debe tener el formato código - nombre, la Fecha debe ser AAAA-MM-DD y Estado solo puede ser ACTIVA, CUMPLIDA o ANULADA.</span></div><footer><a className={`${styles.dialogCancel} ${styles.templateDownload}`} href="/plantillas/plantilla-carga-masiva-multas.xlsx" download>Descargar plantilla</a><button type="button" className={styles.dialogCancel} onClick={onClose} disabled={loading}>Cancelar</button><button type="submit" className="button-primary" disabled={!file || loading}>{loading ? "Cargando…" : "Cargar multas"}</button></footer></form></DialogShell>;
}

function LoadFinesResultDialog({ result, onClose }: { result: ResultadoCargaMultas; onClose: () => void }) {
  return <DialogShell title="Resultado de carga" subtitle={result.errores.length ? "Carga parcial" : "Carga completada"} description={`${result.procesadas} fila(s) procesada(s): ${result.creadas} creada(s) y ${result.actualizadas} actualizada(s).`} onClose={onClose}><div className={styles.loadResultContent}><div className={styles.bulkSummary}><span><strong>{result.creadas}</strong>Creadas</span><span><strong>{result.actualizadas}</strong>Actualizadas</span><span><strong>{result.errores.length}</strong>Con error</span></div>{result.errores.length > 0 && <div className={styles.inlineError}><strong>Detalle de errores</strong><ul>{result.errores.slice(0, 12).map((error) => <li key={`${error.fila}-${error.motivo}`}>Fila {error.fila}: {error.motivo}</li>)}</ul>{result.errores.length > 12 && <small>Se muestran los primeros 12 errores de {result.errores.length}.</small>}</div>}</div><footer className={styles.loadResultFooter}><button type="button" className="button-primary" onClick={onClose}>Entendido</button></footer></DialogShell>;
}

function TransitionDialog({ item, action, onClose, onConfirm }: { item: FineRecord; action: "cumplir" | "anular"; onClose: () => void; onConfirm: (item: FineRecord, action: "cumplir" | "anular", detail: string) => void | Promise<void> }) {
  const [detail, setDetail] = useState("");
  const fulfilling = action === "cumplir";
  return <DialogShell title={fulfilling ? "Registrar cumplimiento" : "Anular multa"} subtitle={item.folio} description={`${item.student.name} · Código ${item.student.code}`} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (detail.trim()) void onConfirm(item, action, detail.trim()); }}><div className={`${styles.transitionIntro} ${!fulfilling ? styles.annulIntro : ""}`}><strong>{fulfilling ? "La multa dejará de bloquear al estudiante" : "Esta es una acción administrativa trazable"}</strong><span>{fulfilling ? "Describa los elementos o compromisos entregados para verificar el cumplimiento." : "Indique claramente por qué la multa debe invalidarse."}</span></div><div className={styles.formGrid}><label className={styles.wideField}><span>{fulfilling ? "Elementos entregados" : "Motivo de anulación"} <small>{detail.length}/2000</small></span><textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={2000} rows={5} required autoFocus /></label></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className={fulfilling ? styles.confirmFulfill : styles.confirmAnnul} disabled={!detail.trim()}>{fulfilling ? "Confirmar cumplimiento" : "Confirmar anulación"}</button></footer></form></DialogShell>;
}

function ReasonDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (payload: Omit<FineReason, "id">) => boolean | Promise<boolean> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return <DialogShell title="Nuevo motivo" subtitle="Catálogo de multas" description="El nombre debe ser único dentro del catálogo." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); void onCreate({ name: name.trim(), description: description.trim() || undefined }); }}><div className={styles.formGrid}><label className={styles.wideField}><span>Nombre <small>{name.length}/160</small></span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required autoFocus /></label><label className={styles.wideField}><span>Descripción <small>Opcional · {description.length}/2000</small></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} /></label></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!name.trim()}>Crear motivo</button></footer></form></DialogShell>;
}

function DialogShell({ title, subtitle, description, onClose, children }: { title: string; subtitle: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}><header><div><span>{subtitle}</span><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header>{children}</section></div>;
}

function formatDate(value?: string | null) {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(date);
}
