"use client";

import { useMemo, useState } from "react";
import { rooms } from "@/features/aulas/data/rooms";
import { initialTasks, taskUsers } from "@/features/tareas/data/tasks";
import type { OperationalTask, TaskStatus } from "@/features/tareas/types";
import styles from "./TasksView.module.css";

const columns: Array<{ status: TaskStatus; label: string; detail: string }> = [
  { status: "PENDIENTE", label: "Pendientes", detail: "Por iniciar" },
  { status: "EN_PROCESO", label: "En proceso", detail: "En ejecución" },
  { status: "COMPLETADA", label: "Completadas", detail: "Trabajo finalizado" },
  { status: "CANCELADA", label: "Canceladas", detail: "Cierre sin ejecución" },
];

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  PENDIENTE: ["EN_PROCESO", "CANCELADA"],
  EN_PROCESO: ["PENDIENTE", "COMPLETADA", "CANCELADA"],
  COMPLETADA: [],
  CANCELADA: [],
};

export function TasksView() {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("todos");
  const [roomFilter, setRoomFilter] = useState("todas");
  const [impactFilter, setImpactFilter] = useState("todas");
  const [editor, setEditor] = useState<OperationalTask | "new" | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<TaskStatus | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return tasks.filter((task) =>
      (responsibleFilter === "todos" || task.responsibleId === responsibleFilter) &&
      (roomFilter === "todas" || task.roomId === roomFilter) &&
      (impactFilter === "todas" || (impactFilter === "si") === task.affectsAvailability) &&
      (!normalized || `${task.code} ${task.title} ${task.description ?? ""} ${task.roomCode ?? ""}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [impactFilter, query, responsibleFilter, roomFilter, tasks]);

  const changeStatus = (task: OperationalTask, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) return;
    if (!allowedTransitions[task.status].includes(nextStatus)) {
      setNotice({ tone: "error", text: `${task.code} no puede pasar de ${statusLabel(task.status)} a ${statusLabel(nextStatus)}.` });
      return;
    }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item));
    setNotice({ tone: "success", text: `${task.code} fue movida a ${statusLabel(nextStatus)}.` });
  };

  const dropTask = (status: TaskStatus) => {
    const task = tasks.find((item) => item.id === draggedId);
    if (task) changeStatus(task, status);
    setDraggedId(null);
    setDragTarget(null);
  };

  const saveTask = (payload: Omit<OperationalTask, "id" | "code" | "status">, item?: OperationalTask) => {
    if (item) {
      setTasks((current) => current.map((task) => task.id === item.id ? { ...task, ...payload } : task));
      setNotice({ tone: "success", text: `${item.code} fue actualizada.` });
    } else {
      const nextNumber = Math.max(...tasks.map((task) => Number(task.code.slice(-4)))) + 1;
      const task: OperationalTask = { ...payload, id: `d0000000-0000-4000-8000-${String(nextNumber).padStart(12, "0")}`, code: `TAR-2026-${String(nextNumber).padStart(4, "0")}`, status: "PENDIENTE" };
      setTasks((current) => [task, ...current]);
      setNotice({ tone: "success", text: `${task.code} creada en estado Pendiente.` });
    }
    setEditor(null);
  };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Tareas Operativas</h1><p>Organice y actualice las actividades de mantenimiento y operación.</p></div><button type="button" className="button-primary" onClick={() => setEditor("new")}>+ Nueva tarea</button></section>

    <section className={styles.metrics} aria-label="Resumen de tareas operativas">{columns.map((column) => <Metric key={column.status} label={column.label} value={tasks.filter((task) => task.status === column.status).length} detail={column.detail} tone={column.status.toLocaleLowerCase()} />)}</section>

    {notice && <div className={`${styles.notice} ${notice.tone === "error" ? styles.noticeError : ""}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <section className={styles.filters}><label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, código, aula o descripción..." aria-label="Buscar tareas" /></label><label><span>Responsable</span><select value={responsibleFilter} onChange={(event) => setResponsibleFilter(event.target.value)}><option value="todos">Todos</option>{taskUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label><span>Aula</span><select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}><option value="todas">Todas</option>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code}</option>)}</select></label><label><span>Disponibilidad</span><select value={impactFilter} onChange={(event) => setImpactFilter(event.target.value)}><option value="todas">Todas</option><option value="si">La afecta</option><option value="no">No la afecta</option></select></label><span>{visibleTasks.length} tarea(s)</span></section>

    <section className={styles.kanban} aria-label="Tablero Kanban de tareas">{columns.map((column) => {
      const columnTasks = visibleTasks.filter((task) => task.status === column.status);
      const canReceive = draggedId ? allowedTransitions[tasks.find((task) => task.id === draggedId)?.status ?? column.status].includes(column.status) : false;
      return <section key={column.status} className={`${styles.column} ${styles[`column_${column.status.toLocaleLowerCase()}`]} ${dragTarget === column.status && canReceive ? styles.dropReady : ""}`} onDragOver={(event) => { if (canReceive) { event.preventDefault(); setDragTarget(column.status); } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragTarget(null); }} onDrop={(event) => { event.preventDefault(); dropTask(column.status); }}><header><div><i /><span><strong>{column.label}</strong><small>{column.detail}</small></span></div><b>{columnTasks.length}</b></header><div className={styles.cardStack}>{columnTasks.map((task) => <TaskCard key={task.id} task={task} dragging={draggedId === task.id} onEdit={() => setEditor(task)} onStatus={(status) => changeStatus(task, status)} onDragStart={(event) => { setDraggedId(task.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", task.id); }} onDragEnd={() => { setDraggedId(null); setDragTarget(null); }} />)}{columnTasks.length === 0 && <div className={styles.emptyColumn}>{dragTarget === column.status ? "Suelte la tarea aquí" : "No hay tareas en esta columna"}</div>}</div></section>;
    })}</section>

    
    {editor && <TaskDialog item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={saveTask} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function TaskCard({ task, dragging, onEdit, onStatus, onDragStart, onDragEnd }: { task: OperationalTask; dragging: boolean; onEdit: () => void; onStatus: (status: TaskStatus) => void; onDragStart: (event: React.DragEvent<HTMLElement>) => void; onDragEnd: () => void }) {
  const responsible = taskUsers.find((user) => user.id === task.responsibleId);
  const terminal = task.status === "COMPLETADA" || task.status === "CANCELADA";
  return <article className={`${styles.taskCard} ${dragging ? styles.dragging : ""}`} draggable={!terminal} onDragStart={onDragStart} onDragEnd={onDragEnd}><header><span>{task.code}</span><div>{task.affectsAvailability && <b>Bloquea aula</b>}<button type="button" onClick={onEdit} aria-label={`Editar ${task.code}`}>•••</button></div></header><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className={styles.taskMeta}>{task.roomCode && <span className={styles.roomTag}>Aula {task.roomCode}</span>}{task.start && <span>{formatShortDate(task.start)}{task.end ? ` – ${formatShortDate(task.end)}` : ""}</span>}</div><footer><span className={styles.assignee}>{responsible ? <><b>{responsible.initials}</b><i><strong>{responsible.name}</strong><small>{responsible.role}</small></i></> : <em>Sin responsable</em>}</span>{!terminal && <span className={styles.dragHint} aria-hidden="true">⋮⋮</span>}</footer>{!terminal && <label className={styles.mobileStatus}><span>Mover a</span><select value="" onChange={(event) => { if (event.target.value) onStatus(event.target.value as TaskStatus); }}><option value="">Seleccione estado</option>{allowedTransitions[task.status].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>}</article>;
}

function TaskDialog({ item, onClose, onSave }: { item?: OperationalTask; onClose: () => void; onSave: (payload: Omit<OperationalTask, "id" | "code" | "status">, item?: OperationalTask) => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [responsibleId, setResponsibleId] = useState(item?.responsibleId ?? "");
  const [roomId, setRoomId] = useState(item?.roomId ?? "");
  const [affects, setAffects] = useState(item?.affectsAvailability ?? false);
  const [start, setStart] = useState(item?.start ? toLocalInput(item.start) : "");
  const [end, setEnd] = useState(item?.end ? toLocalInput(item.end) : "");
  const room = rooms.find((current) => current.id === roomId);
  const missingImpactData = affects && (!roomId || !start || !end);
  const invalidRange = Boolean(start && end && new Date(end) <= new Date(start));
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (missingImpactData || invalidRange) return; onSave({ title: title.trim(), description: description.trim() || undefined, responsibleId: responsibleId || undefined, roomId: roomId || undefined, roomCode: room?.code, affectsAvailability: affects, start: start ? new Date(start).toISOString() : undefined, end: end ? new Date(end).toISOString() : undefined }, item); };
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="task-dialog-title"><header><div><span>Actividad operativa</span><h2 id="task-dialog-title">{item ? "Editar tarea" : "Nueva tarea"}</h2><p>Defina el responsable único, el alcance y su impacto en el aula.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className={styles.formGrid}><label className={styles.wideField}><span>Título</span><input value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus placeholder="Ej. Revisar conectividad de los puestos" /></label><label className={styles.wideField}><span>Descripción <small>Opcional</small></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></label><label><span>Responsable <small>Uno, opcional</small></span><select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value)}><option value="">Sin responsable</option>{taskUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</select></label><label><span>Aula <small>{affects ? "Obligatoria" : "Opcional"}</small></span><select value={roomId} onChange={(event) => setRoomId(event.target.value)} required={affects}><option value="">Sin aula asociada</option>{rooms.map((current) => <option key={current.id} value={current.id}>Aula {current.code} · Piso {current.floor}</option>)}</select></label><label><span>Inicio <small>{affects ? "Obligatorio" : "Opcional"}</small></span><input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required={affects} /></label><label><span>Fin <small>{affects ? "Obligatorio" : "Opcional"}</small></span><input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} required={affects} /></label></div><label className={styles.impactSwitch}><input type="checkbox" checked={affects} onChange={(event) => setAffects(event.target.checked)} /><span><strong>Afecta la disponibilidad del aula</strong><small>La tarea activa bloqueará el aula durante el rango indicado.</small></span></label>{(missingImpactData || invalidRange) && <div className={styles.inlineError}>{invalidRange ? "La fecha de fin debe ser posterior al inicio." : "Las tareas que afectan disponibilidad requieren aula, inicio y fin."}</div>}<div className={styles.singlePersonNote}><strong>Responsable individual</strong><span>El modelo actual no permite agregar participantes adicionales.</span></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!title.trim() || missingImpactData || invalidRange}>{item ? "Guardar cambios" : "Crear tarea"}</button></footer></form></section></div>;
}

function statusLabel(status: TaskStatus) {
  return { PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", COMPLETADA: "Completada", CANCELADA: "Cancelada" }[status];
}
function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value));
}
function toLocalInput(value: string) {
  return new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date(value)).replace(" ", "T");
}
