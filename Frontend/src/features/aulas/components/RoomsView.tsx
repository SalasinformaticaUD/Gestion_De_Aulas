"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { rooms } from "@/features/aulas/data/rooms";
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
  const [status, setStatus] = useState<"todos" | RoomStatus>("todos");
  const [floor, setFloor] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Información general");

  const filteredRooms = useMemo(
    () => rooms.filter((room) => (status === "todos" || room.status === status) && (floor === "todos" || room.floor === Number(floor))),
    [floor, status],
  );

  const selectedRoom = filteredRooms.find((room) => room.id === selectedId);

  const clearSelectedRoom = () => {
    setSelectedId(null);
    setActiveTab("Información general");
  };

  const handleStatusChange = (value: "todos" | RoomStatus) => {
    setStatus(value);
    clearSelectedRoom();
  };

  const handleFloorChange = (value: string) => {
    setFloor(value);
    clearSelectedRoom();
  };

  return (
    <>
      <section className="page-heading rooms-heading">
        <div><h1>Aulas de Software</h1><p>Información detallada de las {rooms.length} aulas · Facultad de Ingeniería.</p></div>
      </section>

      <section className="rooms-layout" aria-label="Administración de aulas">
        <aside className="rooms-panel" aria-label="Listado de aulas">
          <div className="room-filters">
            <label><span className="sr-only">Filtrar por estado</span><select value={status} onChange={(event) => handleStatusChange(event.target.value as "todos" | RoomStatus)}><option value="todos">Todos los estados</option><option value="disponible">Disponible</option><option value="en-clase">En clase</option><option value="reservada">Reservada</option><option value="mantenimiento">Mantenimiento</option></select></label>
            <label><span className="sr-only">Filtrar por piso</span><select value={floor} onChange={(event) => handleFloorChange(event.target.value)}><option value="todos">Todos los pisos</option>{[4, 5, 6, 7].map((level) => <option key={level} value={level}>Piso {level}</option>)}</select></label>
          </div>
          <div className="room-list" role="list">
            {filteredRooms.map((room) => <RoomListItem key={room.id} room={room} selected={room.id === selectedRoom?.id} onSelect={() => { setSelectedId(room.id); setActiveTab("Información general"); }} />)}
            {filteredRooms.length === 0 && <p className="empty-list">No hay aulas para los filtros seleccionados.</p>}
          </div>
        </aside>

        {selectedRoom ? <section className="room-detail" aria-labelledby="room-title">
          <header className="room-detail-header">
            <div><div className="room-title-row"><h2 id="room-title">Aula {selectedRoom.code}</h2><StatusBadge status={selectedRoom.status} /></div><p>Piso {selectedRoom.floor} · {selectedRoom.capacity} puestos · {selectedRoom.software.length} aplicaciones instaladas</p></div>
            <div className="room-actions"><Link className="button-secondary" href={`/audiovisuales?aula=${selectedRoom.code}`}>Audiovisuales</Link><Link className="button-primary room-practice-link" href={`/practicas-libres?aula=${selectedRoom.code}`}>Registrar práctica libre</Link></div>
          </header>

          <div className="room-tabs" role="tablist" aria-label="Detalles del aula">
            {tabs.map((tab) => <button key={tab} role="tab" type="button" aria-selected={activeTab === tab} className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>{tab === "Puestos" ? `${tab} (${selectedRoom.capacity})` : tab === "Software instalado" ? `${tab} (${selectedRoom.software.length})` : tab}</button>)}
          </div>
          <RoomTabContent room={selectedRoom} tab={activeTab} />
        </section> : <section className="room-selection-empty" aria-live="polite">Seleccione un aula para ver su información detallada</section>}
      </section>
    </>
  );
}

function RoomListItem({ room, selected, onSelect }: { room: Room; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={`room-list-item room-status-${room.status} ${selected ? "is-selected" : ""}`} onClick={onSelect} role="listitem"><span><strong>Aula {room.code}</strong><small>Piso {room.floor} · {room.capacity} puestos</small></span><StatusBadge status={room.status} /></button>;
}

function StatusBadge({ status }: { status: RoomStatus }) {
  return <span className={`room-badge room-badge-${status}`}>{statusLabels[status]}</span>;
}

function RoomTabContent({ room, tab }: { room: Room; tab: Tab }) {
  if (tab === "Puestos") {
    const active = room.workstations.filter((workstation) => workstation.status === "operativo").length;
    const withIssues = room.workstations.length - active;
    return <section className="room-tab-content workstation-tab"><div className="workstation-legend"><span><i className="legend-active" />Activo ({active})</span><span><i className="legend-issue" />Con novedad ({withIssues})</span></div><div className="workstation-grid">{room.workstations.map((workstation) => <span key={workstation.number} className={`workstation workstation-${workstation.status}`}>{workstation.number}</span>)}</div></section>;
  }

  if (tab === "Software instalado") {
    return <section className="room-tab-content software-list">{room.software.map((software) => <article key={software.name}><div><strong>{software.name}</strong><span>{software.version} · {software.licenses} lic.</span></div><span className={`software-status software-status-${software.status}`}>{software.status === "activo" ? "Activo" : "Inactivo"}</span></article>)}</section>;
  }

  if (tab === "Historial") {
    return <section className="room-tab-content history-list">{room.history.map((entry) => <article key={`${entry.timestamp}-${entry.action}`}><time>{entry.timestamp}</time><strong>{entry.action}</strong><span>{entry.responsible}</span></article>)}</section>;
  }

  const workingStations = room.workstations.filter((workstation) => workstation.status === "operativo").length;
  return <section className="room-tab-content room-information"><InfoCard label="Identificación" value={`Aula ${room.code}`} /><InfoCard label="Piso" value={`Piso ${room.floor}`} /><InfoCard label="Capacidad total" value={`${room.capacity} puestos`} /><InfoCard label="Puestos operativos" value={`${workingStations} de ${room.capacity}`} /><InfoCard label="Estado actual" value={statusLabels[room.status]} status={room.status} /><InfoCard label="Software instalado" value={`${room.software.length} aplicaciones`} /><InfoCard label="Aplicaciones" value={room.software.map((software) => software.name).join(" · ")} wide /></section>;
}

function InfoCard({ label, value, status, wide = false }: { label: string; value: string; status?: RoomStatus; wide?: boolean }) {
  return <article className={`room-info-card ${wide ? "room-info-wide" : ""}`}><span>{label}</span><strong className={status ? `room-value-${status}` : undefined}>{value}</strong></article>;
}
