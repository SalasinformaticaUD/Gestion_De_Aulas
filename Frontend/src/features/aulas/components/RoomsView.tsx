"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import { actualizarAula, crearAula, eliminarAula, importarAulasExcel, listarAulas, type CrearAulaInput } from "@/features/aulas/api/aulasApi";
import type { Room, RoomStatus } from "@/features/aulas/types";

const statusLabels: Record<RoomStatus, string> = {
  disponible: "Disponible",
  "en-clase": "En clase",
  reservada: "Reservada",
  mantenimiento: "Mantenimiento",
  "fuera-de-servicio": "Fuera de servicio",
};

const tabs = ["Información general", "Software instalado", "Historial"] as const;
type Tab = (typeof tabs)[number];
const isAdmin = () => obtenerSesion()?.usuario.roles.some((rol) => rol.toUpperCase() === "ADMINISTRADOR") ?? false;

function descargarPlantillaAulas(rooms: Room[]) {
  const encabezados = ["Aula de software", "Capacidad", "Proyecto", "Año de equipo", "Marca y modelo de equipos de cómputo", "Característica de equipos", "Necesita renovación"];
  const filas = rooms.map((room) => [
    room.code,
    room.capacity,
    room.curriculumProject === "Sin asignar" ? "" : room.curriculumProject,
    room.acquisitionYear || "",
    room.brandModel === "Sin información" ? "" : room.brandModel,
    room.characteristic === "Sin información" ? "" : room.characteristic,
    room.renewalNeeded ? "Sí" : "No",
  ]);
  const datos = [encabezados, ...filas] as (string | number)[][];
  const hoja = XLSX.utils.aoa_to_sheet(datos);
  hoja["!cols"] = encabezados.map((encabezado) => ({ wch: Math.max(encabezado.length + 4, 18) }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Aulas");
  XLSX.writeFile(libro, "plantilla-aulas.xlsx");
}

export function RoomsView() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [status, setStatus] = useState<"todos" | RoomStatus>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Información general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [uploading, setUploading] = useState(false);
  const canManage = isAdmin();

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

  const filteredRooms = useMemo(
    () => rooms.filter((room) => status === "todos" || room.status === status),
    [rooms, status],
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

  const saveRoom = async (room: Room, input: CrearAulaInput) => {
    const updated = await actualizarAula(room.id, input);
    setRooms((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedId(updated.id);
  };
  const deleteRoom = async (room: Room) => {
    if (!window.confirm(`¿Eliminar el aula ${room.code}? Dejará de aparecer en la gestión y disponibilidad. Sus clases, préstamos y demás historial se conservarán.`)) return;
    try {
      await eliminarAula(room.id);
      setRooms((current) => current.filter((item) => item.id !== room.id));
      clearSelectedRoom();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible eliminar el aula.");
    }
  };

  return (
    <>
      <section className="page-heading rooms-heading">
        <div><h1>Aulas de Software</h1><p>{loading ? "Cargando aulas registradas…" : `Información detallada de ${rooms.length} aula(s) registradas.`}</p></div>
        <div className="room-actions">{canManage && <><button type="button" className="button-primary room-create-button" onClick={() => setIsCreateOpen(true)}>+ Crear aula</button><label className="button-secondary room-upload-button">Subir aulas masivamente<input type="file" accept=".xlsx,.xls" hidden onChange={async (event) => { const archivo = event.target.files?.[0]; if (!archivo) return; setUploading(true); try { const result = await importarAulasExcel(archivo); const preservadas = result.totalConservadasPorHistorial ? `; ${result.totalConservadasPorHistorial} conservadas por historial relacionado` : ""; setError(`Carga completa: ${result.totalRecibidas} fila(s): ${result.totalCreadas} creadas, ${result.totalActualizadas} actualizadas y ${result.totalEliminadas} eliminadas${preservadas}.`); await loadRooms(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible importar el Excel."); } finally { setUploading(false); event.target.value = ""; } }} />{uploading ? " Cargando…" : ""}</label></>}<button type="button" className="button-secondary room-download-button" onClick={() => descargarPlantillaAulas(rooms)}>Descargar plantilla Excel</button></div>
      </section>

      {error && <div className="audiovisual-notice audiovisual-notice-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadRooms()}>Reintentar</button></div>}

      <section className="rooms-layout" aria-label="Administración de aulas">
        <aside className="rooms-panel" aria-label="Listado de aulas">
          <div className="room-filters">
            <label><span className="sr-only">Filtrar por estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as "todos" | RoomStatus); clearSelectedRoom(); }}><option value="todos">Todos los estados</option><option value="disponible">Disponible</option><option value="mantenimiento">Mantenimiento</option><option value="fuera-de-servicio">Fuera de servicio</option></select></label>
          </div>
          <div className="room-list" role="list">
            {filteredRooms.map((room) => <RoomListItem key={room.id} room={room} selected={room.id === selectedRoom?.id} onSelect={() => { setSelectedId(room.id); setActiveTab("Información general"); }} />)}
            {!loading && filteredRooms.length === 0 && <p className="empty-list">No hay aulas registradas. Use “Crear aula” para añadir la primera.</p>}
          </div>
        </aside>

        {selectedRoom ? <section className="room-detail" aria-labelledby="room-title">
          <header className="room-detail-header">
            <div><div className="room-title-row"><h2 id="room-title">Aula {selectedRoom.code}</h2><StatusBadge status={selectedRoom.status} /></div><p>{selectedRoom.software.length} aplicaciones instaladas</p></div>
            {canManage && <div className="room-actions"><button type="button" className="button-secondary" onClick={() => setEditingRoom(selectedRoom)}>Editar aula</button><button type="button" className="button-secondary" onClick={() => void deleteRoom(selectedRoom)}>Eliminar aula</button></div>}
          </header>
          <div className="room-tabs" role="tablist" aria-label="Detalles del aula">
            {tabs.map((tab) => <button key={tab} role="tab" type="button" aria-selected={activeTab === tab} className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>{tab === "Software instalado" ? `${tab} (${selectedRoom.software.length})` : tab}</button>)}
          </div>
          <RoomTabContent room={selectedRoom} tab={activeTab} />
        </section> : <section className="room-selection-empty" aria-live="polite">{loading ? "Cargando…" : "Seleccione un aula o cree una nueva para ver su información."}</section>}
      </section>

      {isCreateOpen && <CreateRoomDialog onClose={() => setIsCreateOpen(false)} onCreate={async (input) => { await registerRoom(input); setIsCreateOpen(false); }} />}
      {editingRoom && <EditRoomDialog room={editingRoom} onClose={() => setEditingRoom(null)} onSave={async (input) => { await saveRoom(editingRoom, input); setEditingRoom(null); }} />}
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
        ubicacion: "Sin ubicación registrada",
        capacidad: Number(values.get("capacidad")),
        estado: String(values.get("estado")) as CrearAulaInput["estado"],
        anioAdquisicion: values.get("anioAdquisicion") ? Number(values.get("anioAdquisicion")) : undefined,
        proyecto: String(values.get("proyecto") ?? "").trim() || undefined,
        marca: String(values.get("marcaModelo") ?? "").trim() || undefined,
        caracteristica: String(values.get("caracteristica") ?? "").trim() || undefined,
        hardware: String(values.get("equipoBase") ?? "").trim() || undefined,
        renovacionTecnologica: values.get("renovacion") === "SI",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible crear el aula.");
      setSaving(false);
    }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="audiovisual-dialog" role="dialog" aria-modal="true" aria-labelledby="create-room-title"><header><div><h2 id="create-room-title">Crear aula</h2><p>Complete los mismos campos de la plantilla Excel. El equipo base es editable solo desde aquí.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className="dialog-grid"><label className="dialog-field"><span>Aula de software</span><input name="codigo" placeholder="Ej. 401" required autoFocus /></label><label className="dialog-field"><span>Capacidad</span><input name="capacidad" type="number" min="1" placeholder="Ej. 30" required /></label><label className="dialog-field"><span>Proyecto</span><input name="proyecto" placeholder="Ej. Ingeniería de Sistemas" required /></label><label className="dialog-field"><span>Estado</span><select name="estado" defaultValue="OPERATIVA"><option value="OPERATIVA">Operativa</option><option value="MANTENIMIENTO">Mantenimiento</option><option value="FUERA_DE_SERVICIO">Fuera de servicio</option></select></label><label className="dialog-field"><span>Año de equipo</span><input name="anioAdquisicion" type="number" min="1900" max="2100" placeholder="Ej. 2024" required /></label><label className="dialog-field"><span>Marca y modelo de equipos de cómputo</span><input name="marcaModelo" placeholder="Ej. Dell OptiPlex 7090" required /></label><label className="dialog-field"><span>Característica de equipos</span><input name="caracteristica" placeholder="Ej. 30 computadores con SSD y 16 GB RAM" required /></label><label className="dialog-field dialog-field-wide"><span>Equipo base <small>(opcional; no se carga desde Excel)</small></span><input name="equipoBase" placeholder="Ej. Proyector, tablero y periféricos" /></label><label className="dialog-field"><span>Necesita renovación</span><select name="renovacion" defaultValue="NO"><option value="NO">No</option><option value="SI">Sí</option></select></label></div>{error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}<footer><button type="button" className="dialog-cancel" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="button-primary" disabled={saving}>{saving ? "Guardando…" : "Crear aula"}</button></footer></form></section></div>;
}

function EditRoomDialog({ room, onClose, onSave }: { room: Room; onClose: () => void; onSave: (input: CrearAulaInput) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); setSaving(true); setError(null);
    try { await onSave({ codigo: String(values.get("codigo") ?? "").trim(), ubicacion: room.location, capacidad: Number(values.get("capacidad")), estado: String(values.get("estado")) as CrearAulaInput["estado"], anioAdquisicion: values.get("anioAdquisicion") ? Number(values.get("anioAdquisicion")) : undefined, proyecto: String(values.get("proyecto") ?? "").trim() || undefined, marca: String(values.get("marcaModelo") ?? "").trim() || undefined, caracteristica: String(values.get("caracteristica") ?? "").trim() || undefined, hardware: String(values.get("equipoBase") ?? "").trim() || undefined, renovacionTecnologica: values.get("renovacion") === "SI" }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible actualizar el aula."); setSaving(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="audiovisual-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-room-title"><header><div><h2 id="edit-room-title">Editar aula {room.code}</h2><p>Actualice los campos del aula. El equipo base se modifica manualmente.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className="dialog-grid"><label className="dialog-field"><span>Aula de software</span><input name="codigo" defaultValue={room.code} required autoFocus /></label><label className="dialog-field"><span>Capacidad</span><input name="capacidad" type="number" min="1" defaultValue={room.capacity} required /></label><label className="dialog-field"><span>Proyecto</span><input name="proyecto" defaultValue={room.curriculumProject === "Sin asignar" ? "" : room.curriculumProject} required /></label><label className="dialog-field"><span>Estado</span><select name="estado" defaultValue={room.status === "mantenimiento" ? "MANTENIMIENTO" : room.status === "fuera-de-servicio" ? "FUERA_DE_SERVICIO" : "OPERATIVA"}><option value="OPERATIVA">Operativa</option><option value="MANTENIMIENTO">Mantenimiento</option><option value="FUERA_DE_SERVICIO">Fuera de servicio</option></select></label><label className="dialog-field"><span>Año de equipo</span><input name="anioAdquisicion" type="number" min="1900" max="2100" defaultValue={room.acquisitionYear || ""} required /></label><label className="dialog-field"><span>Marca y modelo de equipos de cómputo</span><input name="marcaModelo" defaultValue={room.brandModel === "Sin información" ? "" : room.brandModel} required /></label><label className="dialog-field"><span>Característica de equipos</span><input name="caracteristica" defaultValue={room.characteristic === "Sin información" ? "" : room.characteristic} required /></label><label className="dialog-field dialog-field-wide"><span>Equipo base <small>(opcional; no se carga desde Excel)</small></span><input name="equipoBase" defaultValue={room.hardware === "Sin información" ? "" : room.hardware} /></label><label className="dialog-field"><span>Necesita renovación</span><select name="renovacion" defaultValue={room.renewalNeeded ? "SI" : "NO"}><option value="NO">No</option><option value="SI">Sí</option></select></label></div>{error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}<footer><button type="button" className="dialog-cancel" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="button-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button></footer></form></section></div>;
}

function RoomListItem({ room, selected, onSelect }: { room: Room; selected: boolean; onSelect: () => void }) { return <button type="button" className={`room-list-item room-status-${room.status} ${selected ? "is-selected" : ""}`} onClick={onSelect} role="listitem"><span><strong>Aula {room.code}</strong><small>{room.capacity} puestos</small></span><StatusBadge status={room.status} /></button>; }
function StatusBadge({ status }: { status: RoomStatus }) { return <span className={`room-badge room-badge-${status}`}>{statusLabels[status]}</span>; }

function RoomTabContent({ room, tab }: { room: Room; tab: Tab }) {
  if (tab === "Software instalado") return <section className="room-tab-content software-list">{room.software.length ? room.software.map((software) => <article key={software.name}><div><strong>{software.name}</strong><span>{software.version}</span></div><span className="software-status software-status-activo">Activo</span></article>) : <p className="empty-list">No hay software instalado registrado.</p>}</section>;
  if (tab === "Historial") return <section className="room-tab-content history-list">{room.history.length ? room.history.map((entry) => <article key={`${entry.timestamp}-${entry.action}`}><time>{entry.timestamp}</time><strong>{entry.action}</strong><span>{entry.responsible}</span></article>) : <p className="empty-list">Aún no hay historial para esta aula.</p>}</section>;
  return <section className="room-tab-content room-information"><InfoCard label="Identificación" value={`Aula ${room.code}`} /><InfoCard label="Capacidad total" value={`${room.capacity} puestos`} /><InfoCard label="Estado actual" value={statusLabels[room.status]} status={room.status} /><InfoCard label="Proyecto" value={room.curriculumProject} /><InfoCard label="Año de equipo" value={room.acquisitionYear ? String(room.acquisitionYear) : "Sin información"} /><InfoCard label="Marca y modelo de equipos de cómputo" value={room.brandModel} /><InfoCard label="Característica de equipos" value={room.characteristic} /><InfoCard label="Necesita renovación" value={room.renewalNeeded ? "Sí" : "No"} /><InfoCard label="Equipo base" value={room.hardware} wide /></section>;
}
function InfoCard({ label, value, status, wide = false }: { label: string; value: string; status?: RoomStatus; wide?: boolean }) { return <article className={`room-info-card ${wide ? "room-info-wide" : ""}`}><span>{label}</span><strong className={status ? `room-value-${status}` : undefined}>{value}</strong></article>; }
