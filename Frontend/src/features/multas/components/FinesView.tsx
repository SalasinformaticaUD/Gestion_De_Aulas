"use client";

import { useEffect, useMemo, useState } from "react";
import { anularMulta, buscarEstudiante, cargarMultas, crearMotivoMulta, crearMulta, cumplirMulta } from "@/features/multas/api/multasApi";
import type { FineReason, FineRecord, FineStatus, FineStudent } from "@/features/multas/types";
import styles from "./FinesView.module.css";

type View = "activas" | "historial" | "motivos";
const statusLabels: Record<FineStatus, string> = { ACTIVA: "Activa", CUMPLIDA: "Cumplida", ANULADA: "Anulada" };

export function FinesView() {
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [reasons, setReasons] = useState<FineReason[]>([]);
  const [view, setView] = useState<View>("activas");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [showCreate, setShowCreate] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [transition, setTransition] = useState<{ item: FineRecord; action: "cumplir" | "anular" } | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const activeFines = fines.filter((fine) => fine.status === "ACTIVA");
  const historicalFines = fines.filter((fine) => fine.status !== "ACTIVA");
  const visibleFines = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return (view === "activas" ? activeFines : historicalFines).filter((fine) =>
      (statusFilter === "todas" || fine.status === statusFilter) &&
      (!normalized || `${fine.folio} ${fine.student.code} ${fine.student.name} ${fine.description ?? ""} ${reasons.find((reason) => reason.id === fine.reasonId)?.name ?? ""}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [activeFines, historicalFines, query, reasons, statusFilter, view]);

  const reload = async () => { try { const data = await cargarMultas(); setFines(data.fines); setReasons(data.reasons); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible cargar las multas." }); } };
  useEffect(() => { void reload(); }, []);
  const createFine = async (payload: { student: FineStudent; reasonId: string; description?: string }) => {
    try { await crearMulta({ codigoEstudiante: payload.student.code, motivoId: payload.reasonId, descripcion: payload.description }); await reload(); setShowCreate(false); setView("activas"); setNotice({ tone: "success", text: `Multa impuesta a ${payload.student.name}.` }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible crear la multa." }); }
  };

  const completeTransition = async (item: FineRecord, action: "cumplir" | "anular", detail: string) => {
    if (item.status !== "ACTIVA") {
      setNotice({ tone: "error", text: "Solo una multa activa puede cumplirse o anularse." });
      return;
    }
    try { if (action === "cumplir") await cumplirMulta(item.id, detail); else await anularMulta(item.id, detail); await reload(); setTransition(null); setNotice({ tone: "success", text: `${item.folio} fue marcada como ${action === "cumplir" ? "cumplida" : "anulada"}.` }); } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible actualizar la multa." }); }
  };

  const createReason = async (payload: Omit<FineReason, "id">) => {
    try { await crearMotivoMulta(payload); await reload(); setShowReason(false); setNotice({ tone: "success", text: `El motivo “${payload.name}” fue creado correctamente.` }); return true; } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No fue posible crear el motivo." }); return false; }
  };

  const changeView = (next: View) => { setView(next); setStatusFilter("todas"); };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Multas</h1><p>Registro, cumplimiento y anulación de restricciones aplicadas a estudiantes.</p></div><button type="button" className="button-primary" onClick={() => setShowCreate(true)}>+ Nueva multa</button></section>

    <section className={styles.metrics} aria-label="Resumen de multas">
      <Metric label="Activas" value={activeFines.length} detail="Bloquean prácticas libres" tone="red" />
      <Metric label="Cumplidas" value={fines.filter((fine) => fine.status === "CUMPLIDA").length} detail="Compromisos verificados" tone="green" />
      <Metric label="Anuladas" value={fines.filter((fine) => fine.status === "ANULADA").length} detail="Cierres administrativos" tone="neutral" />
      <Metric label="Motivos" value={reasons.length} detail="Catálogo disponible" tone="blue" />
    </section>

    {notice && <div className={`${styles.notice} ${notice.tone === "error" ? styles.noticeError : ""}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <div className={styles.viewTabs} role="tablist" aria-label="Vistas de multas"><button type="button" role="tab" aria-selected={view === "activas"} className={view === "activas" ? styles.activeTab : ""} onClick={() => changeView("activas")}>Multas activas <span>{activeFines.length}</span></button><button type="button" role="tab" aria-selected={view === "historial"} className={view === "historial" ? styles.activeTab : ""} onClick={() => changeView("historial")}>Historial <span>{historicalFines.length}</span></button><button type="button" role="tab" aria-selected={view === "motivos"} className={view === "motivos" ? styles.activeTab : ""} onClick={() => changeView("motivos")}>Motivos <span>{reasons.length}</span></button></div>

    {view !== "motivos" ? <section className={styles.contentCard}><header className={styles.cardHeader}><div><h2>{view === "activas" ? "Restricciones vigentes" : "Trazabilidad de multas"}</h2><p>{view === "activas" ? "Estos estudiantes no pueden registrar prácticas libres." : "Registros cumplidos o anulados, conservados sin eliminación física."}</p></div><span>{visibleFines.length} registro(s)</span></header><div className={styles.toolbar}><label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar estudiante, código, motivo o folio..." aria-label="Buscar multas" /></label>{view === "historial" && <label><span>Estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todas">Todos</option><option value="CUMPLIDA">Cumplidas</option><option value="ANULADA">Anuladas</option></select></label>}<span className={styles.resultCount}>{visibleFines.length} resultado(s)</span></div><div className="table-wrap"><table className={styles.finesTable}><thead><tr><th>Multa</th><th>Estudiante</th><th>Motivo</th><th>Fecha</th><th>Descripción</th><th>Estado</th><th>{view === "activas" ? "Acciones" : "Resolución"}</th></tr></thead><tbody>{visibleFines.map((fine) => <FineRow key={fine.id} fine={fine} reason={reasons.find((reason) => reason.id === fine.reasonId)} onFulfill={() => setTransition({ item: fine, action: "cumplir" })} onAnnul={() => setTransition({ item: fine, action: "anular" })} />)}{visibleFines.length === 0 && <tr><td colSpan={7} className={styles.emptyTable}>No hay multas para los filtros seleccionados.</td></tr>}</tbody></table></div></section> : <ReasonsView reasons={reasons} fines={fines} onCreate={() => setShowReason(true)} />}

    
    {showCreate && <CreateFineDialog reasons={reasons} onClose={() => setShowCreate(false)} onCreate={createFine} />}
    {transition && <TransitionDialog item={transition.item} action={transition.action} onClose={() => setTransition(null)} onConfirm={completeTransition} />}
    {showReason && <ReasonDialog onClose={() => setShowReason(false)} onCreate={createReason} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function FineRow({ fine, reason, onFulfill, onAnnul }: { fine: FineRecord; reason?: FineReason; onFulfill: () => void; onAnnul: () => void }) {
  return <tr><td><strong className={styles.folio}>{fine.folio}</strong><small>Impuesta por {fine.imposedBy ?? "Sistema"}</small></td><td><strong>{fine.student.name}</strong><small>Código {fine.student.code}</small></td><td><span className={styles.reason}>{reason?.name ?? "Motivo no disponible"}</span></td><td><time>{formatDate(fine.date)}</time></td><td><span className={styles.description}>{fine.description || "Sin descripción adicional"}</span></td><td><StatusBadge status={fine.status} /></td><td>{fine.status === "ACTIVA" ? <div className={styles.actions}><button type="button" className={styles.fulfillButton} onClick={onFulfill}>Cumplir</button><button type="button" className={styles.annulButton} onClick={onAnnul}>Anular</button></div> : <details className={styles.resolution}><summary>Ver resolución</summary><div><strong>{fine.status === "CUMPLIDA" ? "Elementos entregados" : "Motivo de anulación"}</strong><p>{fine.status === "CUMPLIDA" ? fine.deliveredItems : fine.annulmentReason}</p><small>{fine.status === "CUMPLIDA" ? `Cumplida por ${fine.fulfilledBy} · ${formatDate(fine.fulfilledAt!)}` : `Anulada por ${fine.annulledBy} · ${formatDate(fine.annulledAt!)}`}</small></div></details>}</td></tr>;
}

function StatusBadge({ status }: { status: FineStatus }) {
  return <span className={`${styles.status} ${styles[`status_${status.toLocaleLowerCase()}`]}`}><i />{statusLabels[status]}</span>;
}

function ReasonsView({ reasons, fines, onCreate }: { reasons: FineReason[]; fines: FineRecord[]; onCreate: () => void }) {
  return <section className={styles.reasonsCard}><header><div><h2>Motivos de multa</h2><p>Catálogo utilizado para clasificar nuevas restricciones.</p></div><button type="button" className="button-primary" onClick={onCreate}>+ Nuevo motivo</button></header><div className={styles.reasonGrid}>{reasons.map((reason) => <article key={reason.id}><header><span>{fines.filter((fine) => fine.reasonId === reason.id).length}</span><strong>{reason.name}</strong></header><p>{reason.description || "Sin descripción registrada."}</p><footer>{fines.filter((fine) => fine.reasonId === reason.id && fine.status === "ACTIVA").length} multa(s) activa(s)</footer></article>)}</div></section>;
}

function CreateFineDialog({ reasons, onClose, onCreate }: { reasons: FineReason[]; onClose: () => void; onCreate: (payload: { student: FineStudent; reasonId: string; description?: string }) => void | Promise<void> }) {
  const [code, setCode] = useState("");
  const [student, setStudent] = useState<FineStudent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reasonId, setReasonId] = useState(reasons[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const lookup = async () => { try { const found = await buscarEstudiante(code.trim()); setStudent(found); setNotFound(!found); } catch { setStudent(null); setNotFound(true); } };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (student && reasonId) void onCreate({ student, reasonId, description: description.trim() || undefined }); };
  return <DialogShell title="Nueva multa" subtitle="Restricción estudiantil" description="Identifique un estudiante existente y seleccione el motivo." onClose={onClose}><form onSubmit={submit}><div className={styles.studentLookup}><label><span>Código estudiantil</span><input value={code} onChange={(event) => { setCode(event.target.value); setStudent(null); setNotFound(false); }} minLength={3} maxLength={30} required autoFocus placeholder="Ej. 2021102044" /></label><button type="button" onClick={lookup} disabled={code.trim().length < 3}>Buscar</button></div>{student && <div className={styles.studentResult}><b>✓</b><span><strong>{student.name}</strong><small>Código {student.code} · Estudiante encontrado</small></span></div>}{notFound && <div className={styles.inlineError}>El estudiante no existe. El backend no crea estudiantes desde el módulo de multas.</div>}<div className={styles.formGrid}><label className={styles.wideField}><span>Motivo</span><select value={reasonId} onChange={(event) => setReasonId(event.target.value)}>{reasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}</select></label><label className={styles.wideField}><span>Descripción <small>Opcional · {description.length}/2000</small></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={5} placeholder="Detalle las circunstancias de la multa..." /></label></div><div className={styles.blockWarning}><strong>Esta acción bloqueará las prácticas libres</strong><span>La restricción permanecerá hasta registrar cumplimiento o anulación.</span></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!student || !reasonId}>Imponer multa</button></footer></form></DialogShell>;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
}
