"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import { cambiarEstadoTarea, crearInformeTarea, crearTarea, decidirTarea, listarResponsablesTarea, listarTareas, type ResponsableTarea } from "@/features/tareas/api/tareasApi";
import type { Room } from "@/features/aulas/types";
import type { OperationalTask, TaskStatus } from "@/features/tareas/types";
import { notify } from "@/lib/notifications";
import styles from "./TasksView.module.css";

const columns: Array<{ status: TaskStatus; label: string; detail: string }> = [
  { status: "PENDIENTE", label: "Pendientes", detail: "Por aceptar" },
  { status: "EN_PROCESO", label: "En proceso", detail: "En ejecución" },
  { status: "COMPLETADA", label: "Completadas", detail: "Trabajo finalizado" },
  { status: "CANCELADA", label: "Canceladas", detail: "Cierre con motivo" },
];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
type TaskView = "actual" | "historial";
type HistoryStatus = "COMPLETADA" | "CANCELADA";
type BoardItem = { id: string; status: TaskStatus; task?: OperationalTask; group?: OperationalTask[] };

export function TasksView() {
  const [tasks, setTasks] = useState<OperationalTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<ResponsableTarea[]>([]);
  const [view, setView] = useState<TaskView>("actual");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("COMPLETADA");
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("todos");
  const [roomFilter, setRoomFilter] = useState("todas");
  const [impactFilter, setImpactFilter] = useState("todas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [newTask, setNewTask] = useState(false);
  const [acceptTask, setAcceptTask] = useState<OperationalTask | null>(null);
  const [reportTask, setReportTask] = useState<OperationalTask | null>(null);
  const [completeTask, setCompleteTask] = useState<OperationalTask | null>(null);
  const [reportRequiredTask, setReportRequiredTask] = useState<OperationalTask | null>(null);
  const [cancelTask, setCancelTask] = useState<OperationalTask | null>(null);
  const [detailTask, setDetailTask] = useState<OperationalTask | null>(null);
  const [manageGroup, setManageGroup] = useState<OperationalTask[] | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<TaskStatus | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const currentUser = typeof window === "undefined" ? null : obtenerSesion()?.usuario ?? null;

  const announceCancellations = (nextTasks: OperationalTask[]) => {
    if (!currentUser) return;
    const storageKey = `tareas-cancelaciones-notificadas:${currentUser.id}`;
    const notified = new Set<string>(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]") as string[]);
    let changed = false;
    for (const task of nextTasks) {
      if (task.status !== "CANCELADA" || task.creatorId !== currentUser.id || !task.canceledById || task.canceledById === currentUser.id || notified.has(task.id)) continue;
      const previousStatus = task.statusBeforeCancellation === "EN_PROCESO" ? "en proceso" : "pendiente";
      notify({ message: `${task.canceledBy?.nombreCompleto ?? "Otro usuario"} canceló tu tarea “${task.title}”, que estaba ${previousStatus}.`, tone: "info" });
      notified.add(task.id); changed = true;
    }
    if (changed) window.sessionStorage.setItem(storageKey, JSON.stringify([...notified]));
  };

  const reload = async () => {
    try {
      const [nextTasks, nextRooms, nextUsers] = await Promise.all([listarTareas(), listarAulas(), listarResponsablesTarea()]);
      announceCancellations(nextTasks);
      setTasks(nextTasks);
      setRooms(nextRooms);
      setUsers(nextUsers);
    } catch (error) {
      showError(error, "No fue posible cargar las tareas.");
    }
  };
  // La carga inicial se ejecuta una sola vez; las mutaciones invocan reload explícitamente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  // Consulta cambios de tareas para mostrar cancelaciones hechas por otros usuarios.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setInterval(async () => { try { const nextTasks = await listarTareas(); announceCancellations(nextTasks); setTasks(nextTasks); } catch { /* La siguiente consulta reintentará automáticamente. */ } }, 30_000); return () => window.clearInterval(timer); }, []);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return tasks.filter((task) => {
      const historical = isHistorical(task, now);
      const responsibleIds = task.responsibles?.map((item) => item.usuarioId) ?? (task.responsibleId ? [task.responsibleId] : []);
      return (view === "historial" ? historical && task.status === historyStatus : !historical) &&
        (responsibleFilter === "todos" || responsibleIds.includes(responsibleFilter)) &&
        (roomFilter === "todas" || task.roomId === roomFilter) &&
        (view === "actual" || impactFilter === "todas" || (impactFilter === "si") === task.affectsAvailability) &&
        (view === "actual" || !dateFrom || !task.createdAt || task.createdAt >= `${dateFrom}T00:00:00`) &&
        (view === "actual" || !dateTo || !task.createdAt || task.createdAt <= `${dateTo}T23:59:59`) &&
        (!normalized || `${task.code} ${task.title} ${task.description ?? ""} ${task.roomCode ?? ""} ${responsibleNames(task)}`.toLocaleLowerCase("es").includes(normalized));
    });
  }, [tasks, now, view, historyStatus, responsibleFilter, roomFilter, impactFilter, dateFrom, dateTo, query]);
  // Las tareas creadas para varias aulas se muestran juntas, pero cada estado
  // conserva su propio grupo para no mezclar aulas pendientes, completadas o canceladas.
  const boardItems = useMemo(() => createBoardItems(visibleTasks), [visibleTasks]);

  const showError = (error: unknown, fallback: string) => setNotice({ tone: "error", text: error instanceof Error ? error.message : fallback });
  useEffect(() => {
    if (notice?.tone !== "success") return;
    const timer = window.setTimeout(() => setNotice((current) => current?.text === notice.text ? null : current), 10_000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const accept = async (responsibleIds: string[]) => {
    if (!acceptTask) return;
    try {
      await decidirTarea(acceptTask.id, "ACEPTADA", responsibleIds);
      setAcceptTask(null); setReportTask(null); await reload();
      setNotice({ tone: "success", text: `${acceptTask.code} fue aceptada. El usuario actual quedó registrado como responsable.` });
    } catch (error) { showError(error, "No fue posible aceptar la tarea."); }
  };
  const saveReport = async (activities: string, pending: string) => {
    if (!reportTask) return;
    try {
      await crearInformeTarea(reportTask.id, activities, pending);
      setReportTask(null); await reload();
      setNotice({ tone: "success", text: pending.trim() ? "Informe guardado. La tarea continúa en proceso y puede ser aceptada nuevamente." : "Informe guardado sin acciones pendientes." });
    } catch (error) { showError(error, "No fue posible guardar el informe."); }
  };
  const complete = async () => {
    if (!completeTask) return;
    try { await cambiarEstadoTarea(completeTask.id, "COMPLETADA"); setCompleteTask(null); await reload(); setNotice({ tone: "success", text: "Tarea completada correctamente." }); }
    catch (error) { setCompleteTask(null); showError(error, "No fue posible completar la tarea."); }
  };
  const requestCompletion = (task: OperationalTask) => {
    if (!task.reports?.length || task.reports[0]?.accionesPendientes?.trim()) {
      setReportRequiredTask(task);
      return;
    }
    setCompleteTask(task);
  };
  const cancel = async (reason: string) => {
    if (!cancelTask) return;
    try { await cambiarEstadoTarea(cancelTask.id, "CANCELADA", reason); setCancelTask(null); await reload(); setNotice({ tone: "success", text: "Tarea cancelada. El motivo quedó registrado en el historial." }); }
    catch (error) { showError(error, "No fue posible cancelar la tarea."); }
  };
  const requestTransition = (task: OperationalTask, status: TaskStatus) => {
    if (task.status === status) return;
    if (status === "CANCELADA" && ["PENDIENTE", "EN_PROCESO"].includes(task.status)) return setCancelTask(task);
    if (status === "EN_PROCESO" && task.status === "PENDIENTE") return setAcceptTask(task);
    if (status === "COMPLETADA" && task.status === "EN_PROCESO") return requestCompletion(task);
    setNotice({ tone: "error", text: transitionMessage(task.status, status) });
  };
  const dropTask = (status: TaskStatus) => {
    const task = tasks.find((item) => item.id === draggedId);
    if (task) requestTransition(task, status);
    setDraggedId(null); setDragTarget(null);
  };
  const exportHistory = () => {
    const rows = visibleTasks.map((task) => ({ Código: task.code, Tarea: task.title, Descripción: task.description ?? "", Aula: task.roomCode ?? "", Responsables: responsibleNames(task), Creada: formatExportDate(task.createdAt), Finalizada: formatExportDate(task.completedAt ?? task.canceledAt), Estado: task.status, "Motivo de cancelación": task.cancellationReason ?? "" }));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), historyStatus === "COMPLETADA" ? "Completadas" : "Canceladas"); XLSX.writeFile(book, `historial-tareas-${historyStatus.toLocaleLowerCase()}.xlsx`);
  };
  const historicalCount = tasks.filter((task) => isHistorical(task, now)).length;

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Tareas Operativas</h1><p>{view === "historial" ? "Consulte las tareas finalizadas que salieron del tablero después de siete días." : "Organice, acepte y dé seguimiento a las actividades operativas."}</p></div>{view === "historial" ? <button type="button" className={styles.historyExportButton} onClick={exportHistory}>Guardar historial</button> : <button type="button" className="button-primary" onClick={() => setNewTask(true)}>+ Nueva tarea</button>}</section>
    <nav className={styles.taskTabs} aria-label="Vistas de tareas"><button type="button" className={view === "actual" ? styles.activeTab : ""} onClick={() => setView("actual")}>Gestión actual <span>{tasks.length - historicalCount}</span></button><button type="button" className={view === "historial" ? styles.activeTab : ""} onClick={() => setView("historial")}>Historial <span>{historicalCount}</span></button></nav>
    <section className={styles.metrics}>{columns.map((column) => <Metric key={column.status} label={column.label} detail={column.detail} tone={column.status.toLocaleLowerCase()} value={tasks.filter((task) => !isHistorical(task, now) && task.status === column.status).length} />)}</section>
    {notice && <div className={`${styles.notice} ${notice.tone === "error" ? styles.noticeError : ""}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)}>×</button></div>}
    <section className={styles.filters}><label className={styles.search}><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por tarea, aula o responsable..." /></label><label><span>Responsable</span><select value={responsibleFilter} onChange={(event) => setResponsibleFilter(event.target.value)}><option value="todos">Todos</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nombreCompleto}</option>)}</select></label><label><span>Aula</span><select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}><option value="todas">Todas</option>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code}</option>)}</select></label>{view === "historial" && <><label><span>Desde</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label><span>Hasta</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><label><span>Disponibilidad</span><select value={impactFilter} onChange={(event) => setImpactFilter(event.target.value)}><option value="todas">Todas</option><option value="si">Bloqueó aula</option><option value="no">No bloqueó aula</option></select></label></>}<span>{visibleTasks.length} tarea(s)</span></section>
    {view === "actual" ? <section className={styles.kanban}>{columns.map((column) => { const items = boardItems.filter((item) => item.status === column.status); return <section key={column.status} className={`${styles.column} ${styles[`column_${column.status.toLocaleLowerCase()}`]} ${dragTarget === column.status ? styles.dropReady : ""}`} onDragOver={(event) => { event.preventDefault(); setDragTarget(column.status); }} onDragLeave={() => setDragTarget(null)} onDrop={() => dropTask(column.status)}><header><div><i /><span><strong>{column.label}</strong><small>{column.detail}</small></span></div><b>{items.length}</b></header><div className={styles.cardStack}>{items.map((item) => item.task ? <TaskCard key={item.id} task={item.task} groupTasks={[]} users={users} currentUserId={currentUser?.id} dragging={draggedId === item.task.id} onDragStart={() => setDraggedId(item.task!.id)} onDragEnd={() => { setDraggedId(null); setDragTarget(null); }} onAccept={() => setAcceptTask(item.task!)} onCancel={() => setCancelTask(item.task!)} onComplete={() => requestCompletion(item.task!)} onReport={() => setReportTask(item.task!)} onView={() => setDetailTask(item.task!)} /> : <GroupTaskCard key={item.id} tasks={item.group!} onManage={() => setManageGroup(item.group!)} />)}{!items.length && <div className={styles.emptyColumn}>Sin tareas</div>}</div></section>; })}</section> : <HistoryPanel tasks={visibleTasks} status={historyStatus} onStatus={setHistoryStatus} onView={setDetailTask} />}
    {newTask && <TaskDialog rooms={rooms} onClose={() => setNewTask(false)} onSave={async (payload) => { try { await crearTarea(payload); setNewTask(false); await reload(); setNotice({ tone: "success", text: "Tarea creada como pendiente y disponible para ser aceptada." }); } catch (error) { showError(error, "No fue posible crear la tarea."); } }} />}
    {acceptTask && currentUser && <AcceptDialog task={acceptTask} users={users} currentUserId={currentUser.id} currentUserName={currentUser.nombreCompleto} onClose={() => setAcceptTask(null)} onConfirm={accept} />}
    {reportTask && currentUser && <ReportDialog task={reportTask} currentUserName={currentUser.nombreCompleto} onClose={() => setReportTask(null)} onSave={saveReport} onAcceptAgain={() => { const task = reportTask; setReportTask(null); setAcceptTask(task); }} />}
    {completeTask && <ConfirmDialog title="Completar tarea" message={`¿Confirma que ${completeTask.code} terminó y no tiene acciones pendientes? Una vez completada no podrá cambiar de estado.`} confirmLabel="Sí, completar" onClose={() => setCompleteTask(null)} onConfirm={complete} />}
    {reportRequiredTask && <ReportRequiredDialog task={reportRequiredTask} onClose={() => setReportRequiredTask(null)} />}
    {cancelTask && <CancelDialog task={cancelTask} onClose={() => setCancelTask(null)} onConfirm={cancel} />}
    {detailTask && <TaskReportDetails task={detailTask} onClose={() => setDetailTask(null)} />}
    {manageGroup && <GroupDialog tasks={manageGroup} currentUserId={currentUser?.id} onClose={() => setManageGroup(null)} onAccept={(task) => { setManageGroup(null); setAcceptTask(task); }} onCancel={(task) => { setManageGroup(null); setCancelTask(task); }} onComplete={(task) => { setManageGroup(null); requestCompletion(task); }} onReport={(task) => { setManageGroup(null); setReportTask(task); }} onView={(task) => { setManageGroup(null); setDetailTask(task); }} />}
  </>;
}

function GroupTaskCard({ tasks, onManage }: { tasks: OperationalTask[]; onManage: () => void }) {
  const first = tasks[0];
  const rooms = tasks.map((task) => task.roomCode).filter(Boolean).join(", ");
  const statusLabel: Partial<Record<TaskStatus, string>> = { PENDIENTE: "Pendientes", EN_PROCESO: "En proceso", COMPLETADA: "Completadas", CANCELADA: "Canceladas" };
  return <article className={styles.groupCard}><header><span>GRUPO DE AULAS · {statusLabel[first.status] ?? first.status}</span><b>{tasks.length} aulas</b></header><h3>{first.title}</h3>{first.description && <p>{first.description}</p>}<div className={styles.groupProgress}><span>{tasks.length} aula(s) en este estado</span></div><small className={styles.groupRooms}>Aulas: {rooms}</small><button type="button" onClick={onManage}>Gestionar aulas</button></article>;
}

function GroupDialog({ tasks, currentUserId, onClose, onAccept, onCancel, onComplete, onReport, onView }: { tasks: OperationalTask[]; currentUserId?: string; onClose: () => void; onAccept: (task: OperationalTask) => void; onCancel: (task: OperationalTask) => void; onComplete: (task: OperationalTask) => void; onReport: (task: OperationalTask) => void; onView: (task: OperationalTask) => void }) {
  const title = tasks[0]?.title ?? "Tarea agrupada";
  return <Modal title={`Aulas de la tarea · ${title}`} subtitle="Cada aula tiene su propio responsable, informe y estado. Gestione solo el aula que corresponda." onClose={onClose} wide><div className={styles.groupDialogList}>{tasks.map((task) => { const canReport = Boolean(currentUserId && (task.responsibleId === currentUserId || task.responsibles?.some((item) => item.usuarioId === currentUserId))); const pending = task.reports?.[0]?.accionesPendientes?.trim(); return <article key={task.id} className={styles.groupRoomRow}><div><strong>Aula {task.roomCode ?? "sin aula"}</strong><span className={styles[`status_${task.status.toLocaleLowerCase()}`]}>{task.status.replace("_", " ")}</span><small>{responsibleNames(task)}</small></div><div>{task.status === "PENDIENTE" && <><button type="button" onClick={() => onAccept(task)}>Aceptar</button><button type="button" onClick={() => onCancel(task)}>Cancelar</button></>}{task.status === "EN_PROCESO" && <><button type="button" onClick={() => onView(task)}>Ver informe</button>{canReport && <button type="button" onClick={() => onReport(task)}>Registrar informe</button>}{pending && <button type="button" onClick={() => onAccept(task)}>Retomar</button>}<button type="button" onClick={() => onComplete(task)}>Completar</button><button type="button" onClick={() => onCancel(task)}>Cancelar</button></>}{["COMPLETADA", "CANCELADA"].includes(task.status) && <button type="button" onClick={() => onView(task)}>Ver detalle</button>}</div></article>; })}</div><footer className={styles.detailsFooter}><button type="button" className={styles.dialogCancel} onClick={onClose}>Cerrar</button></footer></Modal>;
}

function TaskCard({ task, groupTasks, users, currentUserId, dragging, onDragStart, onDragEnd, onAccept, onCancel, onComplete, onReport, onView }: { task: OperationalTask; groupTasks: OperationalTask[]; users: ResponsableTarea[]; currentUserId?: string; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onAccept: () => void; onCancel: () => void; onComplete: () => void; onReport: () => void; onView: () => void }) {
  const canMove = task.status === "PENDIENTE" || task.status === "EN_PROCESO";
  const pending = task.reports?.[0]?.accionesPendientes?.trim();
  const canReport = Boolean(currentUserId && (task.responsibleId === currentUserId || task.responsibles?.some((item) => item.usuarioId === currentUserId)));
  const completedInGroup = groupTasks.filter((item) => item.status === "COMPLETADA").length;
  return <article draggable={canMove} className={`${styles.taskCard} ${dragging ? styles.dragging : ""}`} onDragStart={(event) => { if (!canMove) return; event.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragEnd={onDragEnd}><header><span>{task.code}</span><div>{task.affectsAvailability && <b>Bloquea aula</b>}</div></header><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className={styles.taskMeta}>{task.roomCode && <span className={styles.roomTag}>Aula {task.roomCode}</span>}{groupTasks.length > 1 && <span className={styles.groupTag}>Grupo · {completedInGroup}/{groupTasks.length} aulas completadas</span>}{pending && <span className={styles.pendingTag}>Con acciones pendientes</span>}</div><div className={styles.responsibleList}><strong>{responsibleNames(task, users)}</strong></div>{task.status === "PENDIENTE" && <div className={styles.taskActions}><button type="button" onClick={onAccept}>Aceptar</button><button type="button" onClick={onCancel}>Cancelar</button></div>}{task.status === "EN_PROCESO" && <div className={styles.taskActions}><button type="button" onClick={onView}>Ver informe</button>{canReport && <button type="button" onClick={onReport}>Registrar informe</button>}{pending && <button type="button" onClick={onAccept}>Aceptar continuación</button>}<button type="button" onClick={onComplete}>Completar</button><button type="button" onClick={onCancel}>Cancelar</button></div>}{["COMPLETADA", "CANCELADA"].includes(task.status) && <div className={styles.taskActions}><button type="button" onClick={onView}>Ver informe y detalles</button></div>}<footer><span className={styles.assignee}><em>{task.responsibles?.length ? `${task.responsibles.length} responsable(s)` : "Sin responsables"}</em></span><span className={styles.closedHint}>{task.status === "COMPLETADA" ? "Trabajo finalizado" : task.status === "CANCELADA" ? "Cierre registrado" : "Arrastre para cambiar estado"}</span></footer></article>;
}

function TaskDialog({ rooms, onClose, onSave }: { rooms: Room[]; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [roomIds, setRoomIds] = useState<string[]>([]); const [affects, setAffects] = useState(false); const [saving, setSaving] = useState(false);
  const toggleRoom = (id: string) => setRoomIds((current) => current.includes(id) ? current.filter((roomId) => roomId !== id) : [...current, id]);
  const toggleAllRooms = () => setRoomIds((current) => current.length === rooms.length ? [] : rooms.map((room) => room.id));
  return <Modal title="Nueva tarea" subtitle="Seleccione una o varias aulas. Se creará una tarea independiente por aula y, si son varias, quedarán vinculadas como un grupo con seguimiento y estado propios." onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); if (affects && !roomIds.length) return; setSaving(true); try { await onSave({ titulo: title.trim(), descripcion: description.trim() || undefined, aulaIds: roomIds.length ? roomIds : undefined, afectaDisponibilidad: affects }); } finally { setSaving(false); } }}><div className={styles.formGrid}><label className={styles.wideField}><span>Título</span><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className={styles.wideField}><span>Descripción <small>Opcional</small></span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label><fieldset className={`${styles.roomPicker} ${styles.wideField}`}><legend>Aulas <small>{affects ? "Obligatoria" : "Opcional"}</small></legend><div className={styles.roomPickerHeader}><span>{roomIds.length ? `${roomIds.length} aula(s) seleccionada(s)` : "Sin aula asociada"}</span><button type="button" onClick={toggleAllRooms}>{roomIds.length === rooms.length ? "Limpiar selección" : "Seleccionar todas"}</button></div><div className={styles.roomChecklist}>{rooms.map((room) => <label key={room.id}><input type="checkbox" checked={roomIds.includes(room.id)} onChange={() => toggleRoom(room.id)} /><span>Aula {room.code}</span></label>)}</div></fieldset></div><label className={styles.impactSwitch}><input type="checkbox" checked={affects} onChange={(event) => setAffects(event.target.checked)} /><span><strong>Afecta la disponibilidad de las aulas seleccionadas</strong><small>Cada tarea bloqueará solamente su aula mientras esté en proceso.</small></span></label><DialogFooter onClose={onClose} label={saving ? "Guardando…" : roomIds.length > 1 ? `Crear ${roomIds.length} tareas` : "Crear tarea"} disabled={saving || !title.trim() || (affects && !roomIds.length)} /></form></Modal>;
}

function AcceptDialog({ task, users, currentUserId, currentUserName, onClose, onConfirm }: { task: OperationalTask; users: ResponsableTarea[]; currentUserId: string; currentUserName: string; onClose: () => void; onConfirm: (ids: string[]) => Promise<void> }) {
  const [addMore, setAddMore] = useState(false); const [selected, setSelected] = useState<string[]>([]); const [saving, setSaving] = useState(false);
  const available = users.filter((user) => user.id !== currentUserId);
  return <Modal title="Aceptar tarea" subtitle={`Confirme que va a hacerse cargo de ${task.code}.`} onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); setSaving(true); try { await onConfirm(selected); } finally { setSaving(false); } }}><div className={styles.confirmBox}><strong>{currentUserName}</strong><span>quedará registrado como responsable de esta tarea.</span></div><label className={styles.addMore}><input type="checkbox" checked={addMore} onChange={(event) => { setAddMore(event.target.checked); if (!event.target.checked) setSelected([]); }} /><span><strong>¿Hay más responsables que harán la tarea al mismo tiempo?</strong><small>Puede seleccionar uno o varios usuarios.</small></span></label>{addMore && <div className={styles.userChecklist}>{available.map((user) => <label key={user.id}><input type="checkbox" checked={selected.includes(user.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id))} /><span>{user.nombreCompleto}</span></label>)}{!available.length && <p>No hay otros usuarios activos disponibles.</p>}</div>}<DialogFooter onClose={onClose} label={saving ? "Aceptando…" : "Confirmar y aceptar"} disabled={saving} /></form></Modal>;
}

function ReportDialog({ task, currentUserName, onClose, onSave, onAcceptAgain }: { task: OperationalTask; currentUserName: string; onClose: () => void; onSave: (activities: string, pending: string) => Promise<void>; onAcceptAgain: () => void }) {
  const [activities, setActivities] = useState(""); const [pending, setPending] = useState(""); const [saving, setSaving] = useState(false);
  const hasReports = Boolean(task.reports?.length); const hasPending = Boolean(task.reports?.[0]?.accionesPendientes?.trim()); const canAddReport = !hasReports || hasPending;
  const currentParticipants = task.decisions?.[0]?.participantes?.map((item) => item.nombreCompleto).join(", ") || currentUserName;
  return <Modal title={`Informe de seguimiento · ${task.code}`} subtitle="Cada informe conserva el grupo que realizó esa etapa, lo realizado y lo pendiente." onClose={onClose} wide><form onSubmit={async (event) => { event.preventDefault(); if (!canAddReport || !activities.trim()) return; setSaving(true); try { await onSave(activities, pending); } finally { setSaving(false); } }}><div className={styles.reportTableWrap}><ReportRows task={task} />{canAddReport ? <table className={`${styles.reportTable} ${styles.newReportTable}`}><colgroup><col className={styles.peopleColumn} /><col /><col /></colgroup><tbody><tr className={styles.newReportRow}><td><strong>{currentParticipants}</strong><small>Participantes de esta etapa</small></td><td><textarea required value={activities} onChange={(event) => setActivities(event.target.value)} placeholder="Obligatorio" /></td><td><textarea value={pending} onChange={(event) => setPending(event.target.value)} placeholder="Opcional; déjelo vacío si terminó" /></td></tr>{hasPending && <tr className={styles.continuationRow}><td colSpan={3}><span>La última fila tiene acciones pendientes.</span><button type="button" onClick={onAcceptAgain}>Aceptar nuevamente / escoger responsables</button></td></tr>}</tbody></table> : <div className={styles.readyNotice}><strong>Seguimiento finalizado</strong><span>No se agregan más filas porque el último informe no dejó actividades pendientes. La tarea está lista para completarse.</span></div>}</div><DialogFooter onClose={onClose} label={canAddReport ? (saving ? "Guardando…" : "Guardar informe") : "Informe finalizado"} disabled={!canAddReport || saving || !activities.trim()} /></form></Modal>;
}

function ReportRows({ task }: { task: OperationalTask }) {
  return <table className={styles.reportTable}><colgroup><col className={styles.peopleColumn} /><col /><col /></colgroup><thead><tr><th>Responsables de la etapa</th><th>Actividades realizadas</th><th>Actividades pendientes</th></tr></thead><tbody>{[...(task.reports ?? [])].reverse().map((report) => <tr key={report.id}><td><strong>{report.responsables?.map((item) => item.nombreCompleto).join(", ") || report.autor.nombreCompleto}</strong><small>Informe registrado por {report.autor.nombreCompleto} · {formatShortDate(report.creadoEn)}</small></td><td>{report.actividadesRealizadas}</td><td>{report.accionesPendientes || "Sin acciones pendientes"}</td></tr>)}{!task.reports?.length && <tr><td colSpan={3}>Todavía no hay informes registrados.</td></tr>}</tbody></table>;
}

function ConfirmDialog({ title, message, confirmLabel, onClose, onConfirm }: { title: string; message: string; confirmLabel: string; onClose: () => void; onConfirm: () => Promise<void> }) { const [saving, setSaving] = useState(false); return <Modal title={title} subtitle="Confirme esta acción antes de continuar." onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); setSaving(true); try { await onConfirm(); } finally { setSaving(false); } }}><div className={styles.confirmBox}>{message}</div><DialogFooter onClose={onClose} label={saving ? "Procesando…" : confirmLabel} disabled={saving} /></form></Modal>; }

function ReportRequiredDialog({ task, onClose }: { task: OperationalTask; onClose: () => void }) { const pending = task.reports?.[0]?.accionesPendientes?.trim(); return <Modal title={pending ? "Acciones pendientes" : "Informe de seguimiento requerido"} subtitle={`No se puede completar ${task.code} todavía.`} onClose={onClose}><div className={styles.confirmBox}>{pending ? <><strong>Esta tarea aún tiene acciones pendientes.</strong><span>Registre un nuevo informe de seguimiento cuando estén resueltas, sin acciones pendientes, antes de completarla.</span></> : <><strong>Debe registrar un informe de seguimiento antes de completar esta tarea.</strong><span>El informe deja constancia de las actividades realizadas y confirma que no existen acciones pendientes.</span></>}</div><footer className={styles.detailsFooter}><button type="button" className="button-primary" onClick={onClose}>Entendido</button></footer></Modal>; }

function CancelDialog({ task, onClose, onConfirm }: { task: OperationalTask; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) { const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false); return <Modal title="Cancelar tarea" subtitle={`${task.code} quedará cerrada y no podrá cambiar de estado.`} onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); if (!reason.trim()) return; setSaving(true); try { await onConfirm(reason); } finally { setSaving(false); } }}><div className={styles.formGrid}><label className={styles.wideField}><span>Motivo de cancelación</span><textarea autoFocus required rows={5} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explique por qué se cancela la tarea" /></label></div><DialogFooter onClose={onClose} label={saving ? "Cancelando…" : "Confirmar cancelación"} disabled={saving || !reason.trim()} /></form></Modal>; }

function HistoryPanel({ tasks, status, onStatus, onView }: { tasks: OperationalTask[]; status: HistoryStatus; onStatus: (status: HistoryStatus) => void; onView: (task: OperationalTask) => void }) { return <section className={styles.historyPanel}><header><div><span>Registro permanente</span><h2>Historial de tareas</h2><p>Las tareas aparecen aquí siete días después de completarse o cancelarse.</p></div><div className={styles.historySwitch}><button className={status === "COMPLETADA" ? styles.selected : ""} onClick={() => onStatus("COMPLETADA")}>Completadas</button><button className={status === "CANCELADA" ? styles.selected : ""} onClick={() => onStatus("CANCELADA")}>Canceladas</button></div></header><div className={styles.historyTableWrap}><table className={styles.historyTable}><thead><tr><th>Código</th><th>Tarea</th><th>Aula</th><th>Responsables</th><th>Finalizada</th><th>Seguimiento</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td>{task.code}</td><td><strong>{task.title}</strong><small>{task.description}</small></td><td>{task.roomCode ?? "—"}</td><td>{responsibleNames(task)}</td><td>{formatShortDate(task.completedAt ?? task.canceledAt)}</td><td><button type="button" className={styles.viewReportButton} onClick={() => onView(task)}>Ver informe{task.status === "CANCELADA" ? " y motivo" : ""}</button></td></tr>)}{!tasks.length && <tr><td colSpan={6} className={styles.historyEmpty}>No hay tareas {status === "COMPLETADA" ? "completadas" : "canceladas"} en el historial.</td></tr>}</tbody></table></div></section>; }

function TaskReportDetails({ task, onClose }: { task: OperationalTask; onClose: () => void }) {
  return <Modal title={`Detalle de ${task.code}`} subtitle={task.status === "CANCELADA" ? "Consulte el seguimiento y la información de cancelación." : "Consulte el informe completo de la tarea."} onClose={onClose} wide><div className={styles.detailsBody}>{task.status === "CANCELADA" && <div className={styles.cancellationDetail}><strong>Motivo de cancelación</strong><p>{task.cancellationReason ?? "No se registró un motivo."}</p><small>Cancelada por {task.canceledBy?.nombreCompleto ?? "usuario no disponible"} · {formatShortDate(task.canceledAt)}</small></div>}<div className={styles.reportTableWrap}><ReportRows task={task} /></div><footer className={styles.detailsFooter}><button type="button" className={styles.dialogCancel} onClick={onClose}>Cerrar</button></footer></div></Modal>;
}

function Modal({ title, subtitle, onClose, wide, children }: { title: string; subtitle: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) { return <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`${styles.dialog} ${wide ? styles.dialogWide : ""}`} role="dialog" aria-modal="true"><header><div><span>Tareas operativas</span><h2>{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose}>×</button></header>{children}</section></div>; }
function DialogFooter({ onClose, label, disabled }: { onClose: () => void; label: string; disabled?: boolean }) { return <footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Volver</button><button type="submit" className="button-primary" disabled={disabled}>{label}</button></footer>; }
function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) { return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i /></article>; }
function responsibleNames(task: OperationalTask, users: ResponsableTarea[] = []) { const names = task.responsibles?.map((item) => item.usuario.nombreCompleto) ?? []; if (names.length) return names.join(", "); const legacy = users.find((user) => user.id === task.responsibleId)?.nombreCompleto; return legacy ?? "Sin responsables"; }
function createBoardItems(visible: OperationalTask[]): BoardItem[] {
  const individuales = visible.filter((task) => !task.groupId).map((task) => ({ id: task.id, status: task.status, task }));
  const agrupadas = new Map<string, OperationalTask[]>();
  for (const task of visible) {
    if (!task.groupId) continue;
    const key = `${task.groupId}:${task.status}`;
    const grupo = agrupadas.get(key) ?? [];
    grupo.push(task);
    agrupadas.set(key, grupo);
  }
  return [...individuales, ...[...agrupadas.entries()].map(([key, group]) => ({ id: `grupo-${key}`, status: group[0].status, group }))];
}
function finalDate(task: OperationalTask) { return task.status === "COMPLETADA" ? task.completedAt ?? task.end : task.status === "CANCELADA" ? task.canceledAt : undefined; }
function isHistorical(task: OperationalTask, now: number) { const value = finalDate(task); return Boolean(value && now - new Date(value).getTime() >= WEEK_MS); }
function transitionMessage(from: TaskStatus, to: TaskStatus) { if (from === "PENDIENTE" && to === "COMPLETADA") return "Una tarea pendiente no puede completarse directamente; primero debe aceptarse."; if (to === "PENDIENTE") return "Una tarea que salió de Pendientes no puede regresar a ese estado."; if (["COMPLETADA", "CANCELADA"].includes(from)) return "Las tareas completadas o canceladas no pueden cambiar de estado."; return `No se permite mover una tarea de ${from} a ${to}.`; }
function formatShortDate(value?: string) { if (!value) return "—"; return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(value)); }
function formatExportDate(value?: string) { return value ? formatShortDate(value) : ""; }
