"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cargarAudiovisuales, cancelarPrestamoAudiovisual, crearPrestamoAudiovisual, devolverPrestamoAudiovisual } from "@/features/audiovisuales/api/audiovisualesApi";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { listarDocentes, type DocenteCatalogo } from "@/features/catalogos/api/catalogosApi";
import type { Room } from "@/features/aulas/types";
import type { AudiovisualEquipment, AudiovisualEquipmentStatus, AudiovisualLoan } from "@/features/audiovisuales/types";

const equipmentStatus: Record<AudiovisualEquipmentStatus, string> = {
  DISPONIBLE: "Disponible",
  PRESTADO: "Prestado",
  MANTENIMIENTO: "Mantenimiento",
  FUERA_DE_SERVICIO: "Fuera de servicio",
};

const loanStatus: Record<AudiovisualLoan["status"], string> = {
  SOLICITADO: "Solicitado",
  APROBADO: "Aprobado",
  ACTIVO: "Activo",
  DEVUELTO: "Devuelto",
  CANCELADO: "Cancelado",
  VENCIDO: "Vencido",
};

type View = "inventario" | "prestamos";

export function AudiovisualsView() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("aula") ?? "";
  const [equipment, setEquipment] = useState<AudiovisualEquipment[]>([]);
  const [loans, setLoans] = useState<AudiovisualLoan[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<DocenteCatalogo[]>([]);
  const [view, setView] = useState<View>("inventario");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("todos");
  const [status, setStatus] = useState<"todos" | AudiovisualEquipmentStatus>("todos");
  const [loanEquipment, setLoanEquipment] = useState<AudiovisualEquipment | null>(null);
  const [returnLoan, setReturnLoan] = useState<AudiovisualLoan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const types = useMemo(() => [...new Set(equipment.map((item) => item.type))], [equipment]);
  const filteredEquipment = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return equipment.filter((item) =>
      (type === "todos" || item.type === type) &&
      (status === "todos" || item.status === status) &&
      (!normalized || `${item.inventoryCode} ${item.name} ${item.type}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [equipment, query, status, type]);

  const activeLoans = loans.filter((loan) => loan.status === "ACTIVO" || loan.status === "VENCIDO");
  const count = (value: AudiovisualEquipmentStatus) => equipment.filter((item) => item.status === value).length;
  const equipmentById = (id: string) => equipment.find((item) => item.id === id);

  const reload = async () => { try { const [data, nextRooms, nextTeachers] = await Promise.all([cargarAudiovisuales(), listarAulas(), listarDocentes()]); setEquipment(data.equipment); setLoans(data.loans); setRooms(nextRooms); setTeachers(nextTeachers); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible cargar audiovisuales."); } };
  useEffect(() => { void reload(); }, []);
  const registerLoan = async (payload: { teacherId: string; roomId: string; dueAt: string; equipmentIds: string[] }) => {
    try { await crearPrestamoAudiovisual({ docenteId: payload.teacherId, aulaId: payload.roomId, salidaEn: new Date().toISOString(), devolucionEstimada: new Date(payload.dueAt).toISOString(), equipos: payload.equipmentIds.map((equipoId) => ({ equipoId })) }); await reload(); setLoanEquipment(null); setNotice(`Préstamo registrado con ${payload.equipmentIds.length} equipo(s).`); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible registrar el préstamo."); }
  };

  const completeReturn = async (conditions: Record<string, "DISPONIBLE" | "MANTENIMIENTO">) => {
    if (!returnLoan) return;
    try { await devolverPrestamoAudiovisual(returnLoan.id, returnLoan.equipmentIds.map((equipoId) => ({ equipoId, estadoFisicoDevolucion: "Sin novedades", estadoFuncionalDevolucion: conditions[equipoId] }))); await reload(); setNotice(`Devolución registrada.`); setReturnLoan(null); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible registrar la devolución."); }
  };

  const cancelLoan = async (loan: AudiovisualLoan) => {
    try { await cancelarPrestamoAudiovisual(loan.id); await reload(); setNotice("Préstamo cancelado; los equipos fueron liberados."); } catch (error) { setNotice(error instanceof Error ? error.message : "No fue posible cancelar el préstamo."); }
  };

  return (
    <>
      <section className="page-heading audiovisual-heading">
        <div><h1>Equipos Audiovisuales</h1><p>Control de inventario, préstamos, devoluciones y estado de equipos.</p></div>
        <button type="button" className="button-primary audiovisual-new" disabled={!equipment.some((item) => item.status === "DISPONIBLE")} onClick={() => setLoanEquipment(equipment.find((item) => item.status === "DISPONIBLE") ?? null)}>+ Registrar préstamo</button>
      </section>

      <section className="audiovisual-metrics" aria-label="Resumen de equipos">
        <Metric label="Total inventario" value={equipment.length} tone="neutral" />
        <Metric label="Disponibles" value={count("DISPONIBLE")} tone="success" />
        <Metric label="Prestados" value={count("PRESTADO")} tone="warning" />
        <Metric label="En mantenimiento" value={count("MANTENIMIENTO") + count("FUERA_DE_SERVICIO")} tone="danger" />
      </section>

      {notice && <div className="audiovisual-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

      <div className="audiovisual-view-tabs" role="tablist" aria-label="Vista de audiovisuales">
        <button type="button" role="tab" aria-selected={view === "inventario"} className={view === "inventario" ? "is-active" : ""} onClick={() => setView("inventario")}>Inventario <span>{equipment.length}</span></button>
        <button type="button" role="tab" aria-selected={view === "prestamos"} className={view === "prestamos" ? "is-active" : ""} onClick={() => setView("prestamos")}>Préstamos <span>{loans.length}</span></button>
      </div>

      {view === "inventario" ? <>
        <section className="audiovisual-toolbar" aria-label="Filtros del inventario">
          <label className="audiovisual-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por código, equipo o tipo..." aria-label="Buscar equipos" /></label>
          <label className="field"><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="todos">Todos los tipos</option>{types.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field"><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="todos">Todos los estados</option>{Object.entries(equipmentStatus).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <span className="audiovisual-results">{filteredEquipment.length} resultado(s)</span>
        </section>
        <EquipmentTable equipment={filteredEquipment} activeLoans={activeLoans} onLoan={setLoanEquipment} onReturn={setReturnLoan} />
        <UsageNotice equipment={equipment} />
      </> : <LoansTable loans={loans} equipmentById={equipmentById} onReturn={setReturnLoan} onCancel={cancelLoan} />}

      {loanEquipment && <LoanDialog initial={loanEquipment} equipment={equipment} rooms={rooms} teachers={teachers} initialRoom={initialRoom} onClose={() => setLoanEquipment(null)} onSubmit={registerLoan} />}
      {returnLoan && <ReturnDialog loan={returnLoan} equipmentById={equipmentById} onClose={() => setReturnLoan(null)} onSubmit={completeReturn} />}
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <article className={`audiovisual-metric audiovisual-metric-${tone}`}><span>{label}</span><strong>{value}</strong><i aria-hidden="true" /></article>;
}

function StatusBadge({ status }: { status: AudiovisualEquipmentStatus }) {
  return <span className={`equipment-status equipment-status-${status.toLocaleLowerCase().replaceAll("_", "-")}`}><i aria-hidden="true" />{equipmentStatus[status]}</span>;
}

function EquipmentTable({ equipment, activeLoans, onLoan, onReturn }: { equipment: AudiovisualEquipment[]; activeLoans: AudiovisualLoan[]; onLoan: (item: AudiovisualEquipment) => void; onReturn: (loan: AudiovisualLoan) => void }) {
  const maxLoans = Math.max(1, ...equipment.map((item) => item.loanCount));
  return <section className="audiovisual-card"><div className="table-wrap"><table className="audiovisual-table"><thead><tr><th>Código</th><th>Equipo</th><th>Tipo</th><th>Estado</th><th>Uso acumulado</th><th>Préstamos</th><th>Responsable</th><th>Acciones</th></tr></thead><tbody>
    {equipment.map((item) => {
      const loan = activeLoans.find((current) => current.equipmentIds.includes(item.id));
      return <tr key={item.id}><td><b className="inventory-code">{item.inventoryCode}</b></td><td><strong>{item.name}</strong>{item.observation && <small>{item.observation}</small>}</td><td><span className="equipment-type">{item.type}</span></td><td><StatusBadge status={item.status} /></td><td>{item.usageHours ? <><b>{item.usageHours} h</b><Progress value={Math.min(100, item.usageHours / 3)} danger={item.usageHours > 200} /></> : <span className="table-empty">—</span>}</td><td><b>{item.loanCount}</b><Progress value={(item.loanCount / maxLoans) * 100} danger={item.loanCount > maxLoans * .8} /></td><td>{loan ? <><strong>{loan.teacher}</strong><small>Aula {loan.room} · hasta {formatTime(loan.dueAt)}</small></> : <span className="table-empty">—</span>}</td><td>{item.status === "DISPONIBLE" ? <button className="table-action table-action-primary" type="button" onClick={() => onLoan(item)}>Prestar</button> : item.status === "PRESTADO" && loan ? <button className="table-action table-action-success" type="button" onClick={() => onReturn(loan)}>Devolver</button> : <span className="table-empty">—</span>}</td></tr>;
    })}
    {equipment.length === 0 && <tr><td colSpan={8} className="audiovisual-empty">No hay equipos para los filtros seleccionados.</td></tr>}
  </tbody></table></div></section>;
}

function Progress({ value, danger = false }: { value: number; danger?: boolean }) {
  return <span className="usage-track"><i style={{ width: `${value}%` }} className={danger ? "is-danger" : ""} /></span>;
}

function UsageNotice({ equipment }: { equipment: AudiovisualEquipment[] }) {
  const projectors = equipment.filter((item) => item.type === "Videobeam");
  const highest = [...projectors].sort((a, b) => b.usageHours - a.usageHours)[0];
  const available = projectors.filter((item) => item.status === "DISPONIBLE").sort((a, b) => a.usageHours - b.usageHours).map((item) => item.inventoryCode).join(" y ");
  if (!highest) return <aside className="usage-notice"><span aria-hidden="true">i</span><p><strong>Distribución de uso:</strong> aún no hay videobeams registrados para calcular recomendaciones.</p></aside>;
  return <aside className="usage-notice"><span aria-hidden="true">i</span><p><strong>Distribución de uso:</strong> {highest.inventoryCode} tiene el mayor uso acumulado ({highest.usageHours} h). Se recomienda priorizar {available} para distribuir el desgaste.</p></aside>;
}

function LoansTable({ loans, equipmentById, onReturn, onCancel }: { loans: AudiovisualLoan[]; equipmentById: (id: string) => AudiovisualEquipment | undefined; onReturn: (loan: AudiovisualLoan) => void; onCancel: (loan: AudiovisualLoan) => void }) {
  return <section className="audiovisual-card"><div className="table-wrap"><table className="audiovisual-table loans-table"><thead><tr><th>Préstamo</th><th>Docente / aula</th><th>Equipos</th><th>Salida</th><th>Devolución estimada</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td><b className="inventory-code">{loan.id}</b><small>Entrega: {loan.deliveredBy}</small></td><td><strong>{loan.teacher}</strong><small>Aula {loan.room}</small></td><td><div className="loan-equipment-list">{loan.equipmentIds.map((id) => <span key={id}>{equipmentById(id)?.inventoryCode ?? id}</span>)}</div></td><td>{formatDateTime(loan.checkoutAt)}</td><td>{formatDateTime(loan.dueAt)}</td><td><span className={`loan-status loan-status-${loan.status.toLocaleLowerCase()}`}>{loanStatus[loan.status]}</span></td><td><div className="loan-actions">{(loan.status === "ACTIVO" || loan.status === "VENCIDO") && <><button type="button" className="table-action table-action-success" onClick={() => onReturn(loan)}>Devolver</button><button type="button" className="table-action table-action-muted" onClick={() => onCancel(loan)}>Cancelar</button></>}</div></td></tr>)}{loans.length === 0 && <tr><td colSpan={7} className="audiovisual-empty">No hay préstamos registrados.</td></tr>}</tbody></table></div></section>;
}

function LoanDialog({ initial, equipment, rooms, teachers, initialRoom, onClose, onSubmit }: { initial: AudiovisualEquipment; equipment: AudiovisualEquipment[]; rooms: Room[]; teachers: DocenteCatalogo[]; initialRoom: string; onClose: () => void; onSubmit: (payload: { teacherId: string; roomId: string; dueAt: string; equipmentIds: string[] }) => void | Promise<void> }) {
  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState(rooms.find((room) => room.code === initialRoom)?.id ?? "");
  const [dueAt, setDueAt] = useState("");
  const [selected, setSelected] = useState([initial.id]);
  const available = equipment.filter((item) => item.status === "DISPONIBLE");
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.length > 1 ? current.filter((item) => item !== id) : current : [...current, id]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); void onSubmit({ teacherId, roomId, dueAt, equipmentIds: selected }); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="audiovisual-dialog" role="dialog" aria-modal="true" aria-labelledby="loan-title"><header><div><h2 id="loan-title">Registrar préstamo</h2><p>Seleccione uno o varios equipos disponibles.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className="dialog-grid"><label className="dialog-field"><span>Docente responsable</span><select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} required autoFocus><option value="">Seleccionar docente</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.nombre}</option>)}</select></label><label className="dialog-field"><span>Aula de destino</span><select value={roomId} onChange={(event) => setRoomId(event.target.value)} required><option value="">Seleccionar aula</option>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code}</option>)}</select></label><label className="dialog-field dialog-field-wide"><span>Devolución estimada</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required /></label></div><fieldset className="equipment-picker"><legend>Equipos incluidos <b>{selected.length}</b></legend><div>{available.map((item) => <label key={item.id} className={selected.includes(item.id) ? "is-selected" : ""}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span><strong>{item.inventoryCode}</strong>{item.name}<small>{item.type}</small></span></label>)}</div></fieldset><footer><button type="button" className="dialog-cancel" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!teacherId || !roomId || !dueAt}>Confirmar préstamo</button></footer></form></section></div>;
}

function ReturnDialog({ loan, equipmentById, onClose, onSubmit }: { loan: AudiovisualLoan; equipmentById: (id: string) => AudiovisualEquipment | undefined; onClose: () => void; onSubmit: (conditions: Record<string, "DISPONIBLE" | "MANTENIMIENTO">) => void }) {
  const [conditions, setConditions] = useState<Record<string, "DISPONIBLE" | "MANTENIMIENTO">>(Object.fromEntries(loan.equipmentIds.map((id) => [id, "DISPONIBLE"])));
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="audiovisual-dialog return-dialog" role="dialog" aria-modal="true" aria-labelledby="return-title"><header><div><h2 id="return-title">Registrar devolución</h2><p>{loan.id} · {loan.teacher} · Aula {loan.room}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={(event) => { event.preventDefault(); onSubmit(conditions); }}><fieldset className="return-equipment"><legend>Estado funcional por equipo</legend>{loan.equipmentIds.map((id) => { const item = equipmentById(id); return <label key={id}><span><strong>{item?.inventoryCode}</strong>{item?.name}</span><select value={conditions[id]} onChange={(event) => setConditions((current) => ({ ...current, [id]: event.target.value as "DISPONIBLE" | "MANTENIMIENTO" }))}><option value="DISPONIBLE">Operativo · Disponible</option><option value="MANTENIMIENTO">Con novedad · Mantenimiento</option></select></label>; })}</fieldset><label className="dialog-field"><span>Observaciones de devolución</span><textarea rows={3} placeholder="Describa novedades físicas o funcionales" /></label><footer><button type="button" className="dialog-cancel" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary">Confirmar devolución</button></footer></form></section></div>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(date);
}

