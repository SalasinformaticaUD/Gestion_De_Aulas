"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { crearAula, listarAulas, type CrearAulaInput } from "@/features/aulas/api/aulasApi";
import type { Room, RoomStatus } from "@/features/aulas/types";

const statusLabels: Record<RoomStatus, string> = {
  disponible: "Disponible",
  "en-clase": "En clase",
  reservada: "Reservada",
  mantenimiento: "Mantenimiento",
};

const tabs = ["Información general", "Puestos", "Software instalado", "Historial"] as const;
type Tab = (typeof tabs)[number];

export function RoomsView() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [status, setStatus] = useState<"todos" | RoomStatus>("todos");
  const [floor, setFloor] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Información general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listarAulas();
      setRooms(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar las aulas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRooms(); }, []);

  const floors = useMemo(() => [...new Set(rooms.map((room) => room.floor).filter((value) => value > 0))].sort((a, b) => a - b), [rooms]);
  const filteredRooms = useMemo(
    () => rooms.filter((room) => (status === "todos" || room.status === status) && (floor === "todos" || room.floor === Number(floor))),
    [floor, rooms, status],
  );
  const selectedRoom = rooms.find((room) => room.id === selectedId) ?? null;

  const clearSelectedRoom = () => {
    setSelectedId(null);
    setActiveTab("Información general");
  };

  const registerRoom = async (input: CrearAulaInput) => {
    const created = await crearAula(input);
    setRooms((current) => [...current, created].sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true })));
    setSelectedId(created.id);
    setActiveTab("Información general");
  };

  return (
    <>
      <section className="page-heading rooms-heading">
        <div><h1>Aulas de Software</h1><p>{loading ? "Cargando aulas registradas…" : `Información detallada de ${rooms.length} aula(s) registradas.`}</p></div>
        <button type="button" className="button-primary" onClick={() => setIsCreateOpen(true)}>+ Crear aula</button>
      </section>

      {error && <div className="audiovisual-notice audiovisual-notice-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadRooms()}>Reintentar</button></div>}

      <section className="rooms-layout" aria-label="Administración de aulas">
        <aside className="rooms-panel" aria-label="Listado de aulas">
          <div className="room-filters">
            <label><span className="sr-only">Filtrar por estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as "todos" | RoomStatus); clearSelectedRoom(); }}><option value="todos">Todos los estados</option><option value="disponible">Disponible</option><option value="mantenimiento">Mantenimiento</option></select></label>
            <label><span className="sr-only">Filtrar por piso</span><select value={floor} onChange={(event) => { setFloor(event.target.value); clearSelectedRoom(); }}><option value="todos">Todos los pisos</option>{floors.map((level) => <option key={level} value={level}>Piso {level}</option>)}</select></label>
          </div>
          <div className="room-list" role="list">
            {filteredRooms.map((room) => <RoomListItem key={room.id} room={room} selected={room.id === selectedRoom?.id} onSelect={() => { setSelectedId(room.id); setActiveTab("Información general"); }} />)}
            {!loading && filteredRooms.length === 0 && <p className="empty-list">No hay aulas registradas. Use “Crear aula” para añadir la primera.</p>}
          </div>
        </aside>

        {selectedRoom ? <section className="room-detail" aria-labelledby="room-title">
          <header className="room-detail-header">
            <div><div className="room-title-row"><h2 id="room-title">Aula {selectedRoom.code}</h2><StatusBadge status={selectedRoom.status} /></div><p>{selectedRoom.location} · Piso {selectedRoom.floor || "sin definir"} · {selectedRoom.capacity} puestos · {selectedRoom.software.length} aplicaciones instaladas</p></div>
            <div className="room-actions"><Link className="button-secondary" href={`/audiovisuales?aula=${selectedRoom.code}`}>Audiovisuales</Link><Link className="button-primary room-practice-link" href={`/practicas-libres?aula=${selectedRoom.code}`}>Registrar práctica libre</Link></div>
          </header>
          <div className="room-tabs" role="tablist" aria-label="Detalles del aula">
            {tabs.map((tab) => <button key={tab} role="tab" type="button" aria-selected={activeTab === tab} className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>{tab === "Puestos" ? `${tab} (${selectedRoom.capacity})` : tab === "Software instalado" ? `${tab} (${selectedRoom.software.length})` : tab}</button>)}
          </div>
          <RoomTabContent room={selectedRoom} tab={activeTab} />
        </section> : <section className="room-selection-empty" aria-live="polite">{loading ? "Cargando…" : "Seleccione un aula o cree una nueva para ver su información."}</section>}
      </section>

      {isCreateOpen && <CreateRoomDialog onClose={() => setIsCreateOpen(false)} onCreate={async (input) => { await registerRoom(input); setIsCreateOpen(false); }} />}
    </>
  );
}

function CreateRoomDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (input: CrearAulaInput) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true); setError(null);
    try {
      await onCreate({
        codigo: String(values.get("codigo") ?? "").trim(),
        ubicacion: String(values.get("ubicacion") ?? "").trim(),
        capacidad: Number(values.get("capacidad")),
        estado: String(values.get("estado")) as CrearAulaInput["estado"],
        anioAdquisicion: values.get("anioAdquisicion") ? Number(values.get("anioAdquisicion")) : undefined,
        marca: String(values.get("marca") ?? "").trim() || undefined,
        modelo: String(values.get("modelo") ?? "").trim() || undefined,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible crear el aula.");
      setSaving(false);
    }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="audiovisual-dialog" role="dialog" aria-modal="true" aria-labelledby="create-room-title"><header><div><h2 id="create-room-title">Crear aula</h2><p>La información se guardará directamente en la API central.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className="dialog-grid"><label className="dialog-field"><span>Código del aula</span><input name="codigo" placeholder="Ej. 401" required autoFocus /></label><label className="dialog-field"><span>Capacidad</span><input name="capacidad" type="number" min="1" placeholder="Ej. 30" required /></label><label className="dialog-field dialog-field-wide"><span>Ubicación</span><input name="ubicacion" placeholder="Ej. Edificio Sabio Caldas, piso 4" required /></label><label className="dialog-field"><span>Estado inicial</span><select name="estado" defaultValue="OPERATIVA"><option value="OPERATIVA">Operativa</option><option value="MANTENIMIENTO">Mantenimiento</option><option value="FUERA_DE_SERVICIO">Fuera de servicio</option></select></label><label className="dialog-field"><span>Año de adquisición</span><input name="anioAdquisicion" type="number" min="1900" max="2100" placeholder="Opcional" /></label><label className="dialog-field"><span>Marca</span><input name="marca" placeholder="Opcional" /></label><label className="dialog-field"><span>Modelo</span><input name="modelo" placeholder="Opcional" /></label></div>{error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}<footer><button type="button" className="dialog-cancel" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="button-primary" disabled={saving}>{saving ? "Guardando…" : "Crear aula"}</button></footer></form></section></div>;
}

function RoomListItem({ room, selected, onSelect }: { room: Room; selected: boolean; onSelect: () => void }) { return <button type="button" className={`room-list-item room-status-${room.status} ${selected ? "is-selected" : ""}`} onClick={onSelect} role="listitem"><span><strong>Aula {room.code}</strong><small>Piso {room.floor || "sin definir"} · {room.capacity} puestos</small></span><StatusBadge status={room.status} /></button>; }
function StatusBadge({ status }: { status: RoomStatus }) { return <span className={`room-badge room-badge-${status}`}>{statusLabels[status]}</span>; }

function RoomTabContent({ room, tab }: { room: Room; tab: Tab }) {
  if (tab === "Puestos") return <section className="room-tab-content workstation-tab"><p className="empty-list">Los puestos se podrán registrar cuando se habilite su módulo de inventario.</p></section>;
  if (tab === "Software instalado") return <section className="room-tab-content software-list">{room.software.length ? room.software.map((software) => <article key={software.name}><div><strong>{software.name}</strong><span>{software.version}</span></div><span className="software-status software-status-activo">Activo</span></article>) : <p className="empty-list">No hay software instalado registrado.</p>}</section>;
  if (tab === "Historial") return <section className="room-tab-content history-list">{room.history.length ? room.history.map((entry) => <article key={`${entry.timestamp}-${entry.action}`}><time>{entry.timestamp}</time><strong>{entry.action}</strong><span>{entry.responsible}</span></article>) : <p className="empty-list">Aún no hay historial para esta aula.</p>}</section>;
  return <section className="room-tab-content room-information"><InfoCard label="Identificación" value={`Aula ${room.code}`} /><InfoCard label="Ubicación" value={room.location} /><InfoCard label="Piso" value={room.floor ? `Piso ${room.floor}` : "Sin definir"} /><InfoCard label="Capacidad total" value={`${room.capacity} puestos`} /><InfoCard label="Estado actual" value={statusLabels[room.status]} status={room.status} /><InfoCard label="Equipo base" value={room.hardware} /><InfoCard label="Software instalado" value={`${room.software.length} aplicaciones`} /><InfoCard label="Proyecto curricular" value={room.curriculumProject} wide /></section>;
}
function InfoCard({ label, value, status, wide = false }: { label: string; value: string; status?: RoomStatus; wide?: boolean }) { return <article className={`room-info-card ${wide ? "room-info-wide" : ""}`}><span>{label}</span><strong className={status ? `room-value-${status}` : undefined}>{value}</strong></article>; }
