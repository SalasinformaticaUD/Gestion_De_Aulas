"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { audiovisualEquipment, audiovisualLoans } from "@/features/audiovisuales/data/audiovisuals";
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
  const [equipment, setEquipment] = useState(audiovisualEquipment);
  const [loans, setLoans] = useState(audiovisualLoans);
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

  const registerLoan = (payload: { teacher: string; room: string; dueAt: string; equipmentIds: string[] }) => {
    const nextNumber = String(87 + loans.length).padStart(4, "0");
    const newLoan: AudiovisualLoan = {
      id: `PA-2026-${nextNumber}`,
      teacher: payload.teacher,
      room: payload.room,
      checkoutAt: new Date().toISOString(),
      dueAt: payload.dueAt,
      status: "ACTIVO",
      equipmentIds: payload.equipmentIds,
      deliveredBy: "Jhon Rodríguez",
    };
    setLoans((current) => [newLoan, ...current]);
    setEquipment((current) => current.map((item) => payload.equipmentIds.includes(item.id) ? { ...item, status: "PRESTADO", loanCount: item.loanCount + 1 } : item));
    setLoanEquipment(null);
    setNotice(`Préstamo ${newLoan.id} registrado con ${payload.equipmentIds.length} equipo(s).`);
  };

  const completeReturn = (conditions: Record<string, "DISPONIBLE" | "MANTENIMIENTO">) => {
    if (!returnLoan) return;
    setEquipment((current) => current.map((item) => conditions[item.id] ? { ...item, status: conditions[item.id] } : item));
    setLoans((current) => current.map((loan) => loan.id === returnLoan.id ? { ...loan, status: "DEVUELTO", returnedAt: new Date().toISOString() } : loan));
    setNotice(`Devolución del préstamo ${returnLoan.id} registrada.`);
    setReturnLoan(null);
  };

  const cancelLoan = (loan: AudiovisualLoan) => {
    setLoans((current) => current.map((item) => item.id === loan.id ? { ...item, status: "CANCELADO" } : item));
    setEquipment((current) => current.map((item) => loan.equipmentIds.includes(item.id) ? { ...item, status: "DISPONIBLE" } : item));
    setNotice(`Préstamo ${loan.id} cancelado; los equipos volvieron a estar disponibles.`);
  };

  return (
    <>
      <section className="page-heading audiovisual-heading">
        <div><span className="page-kicker">Módulo P06</span><h1>Equipos Audiovisuales</h1><p>Control de inventario, préstamos, devoluciones y estado de equipos.</p></div>
        <button type="button" className="button-primary audiovisual-new" onClick={() => setLoanEquipment(equipment.find((item) => item.status === "DISPONIBLE") ?? null)}>+ Registrar préstamo</button>
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

      {loanEquipment && <LoanDialog initial={loanEquipment} equipment={equipment} initialRoom={initialRoom} onClose={() => setLoanEquipment(null)} onSubmit={registerLoan} />}
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
  const maxLoans = Math.max(...audiovisualEquipment.map((item) => item.loanCount));
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
  return <aside className="usage-notice"><span aria-hidden="true">i</span><p><strong>Distribución de uso:</strong> {highest.inventoryCode} tiene el mayor uso acumulado ({highest.usageHours} h). Se recomienda priorizar {available} para distribuir el desgaste.</p></aside>;
}

function LoansTable({ loans, equipmentById, onReturn, onCancel }: { loans: AudiovisualLoan[]; equipmentById: (id: string) => AudiovisualEquipment | undefined; onReturn: (loan: AudiovisualLoan) => void; onCancel: (loan: AudiovisualLoan) => void }) {
  return <section className="audiovisual-card"><div className="table-wrap"><table className="audiovisual-table loans-table"><thead><tr><th>Préstamo</th><th>Docente / aula</th><th>Equipos</th><th>Salida</th><th>Devolución estimada</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td><b className="inventory-code">{loan.id}</b><small>Entrega: {loan.deliveredBy}</small></td><td><strong>{loan.teacher}</strong><small>Aula {loan.room}</small></td><td><div className="loan-equipment-list">{loan.equipmentIds.map((id) => <span key={id}>{equipmentById(id)?.inventoryCode ?? id}</span>)}</div></td><td>{formatDateTime(loan.checkoutAt)}</td><td>{formatDateTime(loan.dueAt)}</td><td><span className={`loan-status loan-status-${loan.status.toLocaleLowerCase()}`}>{loanStatus[loan.status]}</span></td><td><div className="loan-actions">{(loan.status === "ACTIVO" || loan.status === "VENCIDO") && <><button type="button" className="table-action table-action-success" onClick={() => onReturn(loan)}>Devolver</button><button type="button" className="table-action table-action-muted" onClick={() => onCancel(loan)}>Cancelar</button></>}</div></td></tr>)}</tbody></table></div></section>;
}

function LoanDialog({ initial, equipment, initialRoom, onClose, onSubmit }: { initial: AudiovisualEquipment; equipment: AudiovisualEquipment[]; initialRoom: string; onClose: () => void; onSubmit: (payload: { teacher: string; room: string; dueAt: string; equipmentIds: string[] }) => void }) {
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState(initialRoom);
  const [dueAt, setDueAt] = useState("");
  const [selected, setSelected] = useState([initial.id]);
  const available = equipment.filter((item) => item.status === "DISPONIBLE");
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.length > 1 ? current.filter((item) => item !== id) : current : [...current, id]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); onSubmit({ teacher: teacher.trim(), room, dueAt, equipmentIds: selected }); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="audiovisual-dialog" role="dialog" aria-modal="true" aria-labelledby="loan-title"><header><div><h2 id="loan-title">Registrar préstamo</h2><p>Seleccione uno o varios equipos disponibles.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className="dialog-grid"><label className="dialog-field"><span>Docente responsable</span><input value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="Nombre del docente" required autoFocus /></label><label className="dialog-field"><span>Aula de destino</span><select value={room} onChange={(event) => setRoom(event.target.value)} required><option value="">Seleccionar aula</option>{["401","402","403","404","405","406","501","502","503","504","505","506","601","602","603","604","605","606","701","702"].map((item) => <option key={item} value={item}>Aula {item}</option>)}</select></label><label className="dialog-field dialog-field-wide"><span>Devolución estimada</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required /></label></div><fieldset className="equipment-picker"><legend>Equipos incluidos <b>{selected.length}</b></legend><div>{available.map((item) => <label key={item.id} className={selected.includes(item.id) ? "is-selected" : ""}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span><strong>{item.inventoryCode}</strong>{item.name}<small>{item.type}</small></span></label>)}</div></fieldset><label className="dialog-field"><span>Observaciones de salida</span><textarea rows={2} placeholder="Estado físico o funcional al momento de la entrega" /></label><footer><button type="button" className="dialog-cancel" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary">Confirmar préstamo</button></footer></form></section></div>;
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

