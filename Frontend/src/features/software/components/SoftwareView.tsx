"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { actualizarSoftware, asignarSoftware as guardarAsignacion, cargarSoftware, cargarSoftwarePaginado, crearSoftware, eliminarSoftware, importarSoftwareExcel, retirarSoftware, type ResultadoImportacionSoftwareExcel } from "@/features/software/api/softwareApi";
import type { InstalledSoftware, SoftwareAssignment } from "@/features/software/types";
import type { Room } from "@/features/aulas/types";
import styles from "./SoftwareView.module.css";

type View = "catalogo" | "aulas";

const softwareStatusLabels = {
  ACTIVO: "Activo",
  SIN_LICENCIA: "Sin licencia",
  LICENCIADO: "Licenciado",
  EN_REVISION: "En revisión",
  INACTIVO: "Inactivo",
} as const;

export function SoftwareView() {
  const [software, setSoftware] = useState<InstalledSoftware[]>([]);
  const [assignments, setAssignments] = useState<SoftwareAssignment[]>([]);
  const [roomSoftware, setRoomSoftware] = useState<InstalledSoftware[]>([]);
  const [roomAssignments, setRoomAssignments] = useState<SoftwareAssignment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [view, setView] = useState<View>("catalogo");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [searchText, setSearchText] = useState("");
  const [roomFilter, setRoomFilter] = useState("todas");
  const [requiredSoftware, setRequiredSoftware] = useState<string[]>([]);
  const [roomSearchText, setRoomSearchText] = useState("");
  const [editor, setEditor] = useState<InstalledSoftware | "new" | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<ResultadoImportacionSoftwareExcel | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const catalogCache = useRef(new Map<string, Awaited<ReturnType<typeof cargarSoftwarePaginado>>>());

  const loadCatalog = useCallback(async (targetPage = page, force = false) => {
    const key = `${targetPage}:${query.trim().toLocaleLowerCase("es")}`;
    try {
      const loaded = !force && catalogCache.current.get(key) || await cargarSoftwarePaginado(targetPage, query);
      if (!catalogCache.current.has(key) || force) catalogCache.current.set(key, loaded);
      setSoftware(loaded.software); setAssignments(loaded.assignments); setMeta(loaded.meta);
    } catch (cause) { setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "No fue posible cargar el catálogo de software." }); }
  }, [page, query]);
  const loadRoomInventory = useCallback(async () => {
    try {
      const loaded = await cargarSoftware();
      setRoomSoftware(loaded.software);
      setRoomAssignments(loaded.assignments);
    } catch (cause) {
      setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "No fue posible cargar el inventario de software por aula." });
    }
  }, []);
  useEffect(() => { void listarAulas().then(setRooms).catch((cause) => setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "No fue posible cargar las aulas." })); }, []);
  useEffect(() => { void loadCatalog(); }, [loadCatalog]);
  useEffect(() => { if (view === "aulas") void loadRoomInventory(); }, [loadRoomInventory, view]);

  const visibleSoftware = useMemo(() => roomFilter === "todas" ? software : software.filter((item) => assignments.some((assignment) => assignment.softwareId === item.id && assignment.roomId === roomFilter)), [assignments, roomFilter, software]);

  const coveredRooms = new Set(assignments.map((assignment) => assignment.roomId)).size;

  const saveSoftware = async (payload: Omit<InstalledSoftware, "id">, id?: string, aulaId?: string, installedAt?: string) => {
    const duplicate = software.some((item) => item.id !== id && item.name.toLocaleLowerCase("es") === payload.name.toLocaleLowerCase("es") && item.version.toLocaleLowerCase("es") === payload.version.toLocaleLowerCase("es"));
    if (duplicate) {
      setNotice({ tone: "error", text: "Ya existe software con el mismo nombre y versión." });
      return false;
    }
    if (id) {
      try {
        const updated = await actualizarSoftware(id, payload);
        catalogCache.current.clear(); setSoftware((current) => current.map((item) => item.id === id ? updated : item)); void loadRoomInventory();
        setNotice({ tone: "success", text: `${payload.name} ${payload.version} fue actualizado.` });
      } catch (cause) {
        setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "No fue posible actualizar el software." });
        return false;
      }
    } else {
      try {
        const created = await crearSoftware(payload);
        if (aulaId) {
          await guardarAsignacion(aulaId, created.id, installedAt ?? "");
          setAssignments((current) => [{ roomId: aulaId, softwareId: created.id, installedAt: installedAt || new Date().toISOString().slice(0, 10) }, ...current]);
        }
        catalogCache.current.clear(); setPage(1); await loadCatalog(1, true); void loadRoomInventory();
        const aula = rooms.find((room) => room.id === aulaId);
        setNotice({ tone: "success", text: aula ? `${payload.name} ${payload.version} fue creado y asociado con el Aula ${aula.code}.` : `${payload.name} ${payload.version} fue agregado al catálogo.` });
      } catch (cause) {
        setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "No fue posible crear el software." });
        return false;
      }
    }
    setEditor(null);
    return true;
  };

  const deleteSoftware = async (item: InstalledSoftware) => {
    const count = assignments.filter((assignment) => assignment.softwareId === item.id).length;
    if (count > 0) {
      setNotice({ tone: "error", text: `No se puede eliminar ${item.name}: está asociado con ${count} aula(s).` });
      return;
    }
    try {
      await eliminarSoftware(item.id);
      catalogCache.current.clear(); await loadCatalog(page, true); void loadRoomInventory();
      setNotice({ tone: "success", text: `${item.name} ${item.version} fue eliminado del catálogo.` });
    } catch (cause) {
      setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "No fue posible eliminar el software." });
    }
  };

  const removeAssignment = async (assignment: SoftwareAssignment) => {
    try {
      await retirarSoftware(assignment.roomId, assignment.softwareId);
      catalogCache.current.clear();
      setAssignments((current) => current.filter((item) => !(item.roomId === assignment.roomId && item.softwareId === assignment.softwareId)));
      const item = software.find((softwareItem) => softwareItem.id === assignment.softwareId);
      const room = rooms.find((roomItem) => roomItem.id === assignment.roomId);
      void loadRoomInventory();
      setNotice({ tone: "success", text: `${item?.name} fue retirado del Aula ${room?.code}.` });
    } catch (cause) {
      setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "No fue posible retirar el software del aula." });
    }
  };

  const importExcel = async (archivo: File) => {
    try {
      const resultado = await importarSoftwareExcel(archivo);
      catalogCache.current.clear(); setPage(1); await loadCatalog(1, true); void loadRoomInventory();
      setShowImport(false);
      setImportResult(resultado);
      setNotice({ tone: resultado.resumen.resultado === "FALLIDA" ? "error" : "success", text: `Importación ${resultado.resumen.resultado.toLocaleLowerCase("es")}: ${resultado.resumen.registrosProcesados} de ${resultado.resumen.totalRegistros} filas asociadas.${resultado.resumen.registrosConError ? ` ${resultado.resumen.registrosConError} con error.` : ""}` });
    } catch (cause) {
      setNotice({ tone: "error", text: cause instanceof Error ? cause.message : "No fue posible importar el Excel." });
    }
  };

  return <>
    <section className={`page-heading ${styles.heading}`}>
      <div><h1>Software Instalado</h1><p>Catálogo, instalaciones por aula e importaciones del inventario de software.</p></div>
      <div className={styles.headingActions}><button type="button" className={styles.secondaryButton} onClick={() => setShowImport(true)}>Cargar software masivamente</button><button type="button" className="button-primary" onClick={() => setEditor("new")}>+ Nuevo software</button></div>
    </section>

    <section className={styles.metrics} aria-label="Resumen del software instalado">
      <Metric label="Catálogo" value={meta.total} detail="Nombre y versión únicos" tone="red" />
      <Metric label="Instalaciones" value={assignments.length} detail="Asociaciones activas" tone="blue" />
      <Metric label="Aulas cubiertas" value={coveredRooms} detail={`de ${rooms.length} aulas registradas`} tone="green" />
    </section>

    {notice && <div className={`${styles.notice} ${notice.tone === "error" ? styles.noticeError : ""}`} role="status"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <div className={styles.viewTabs} role="tablist" aria-label="Vistas de software instalado">
      <button type="button" role="tab" aria-selected={view === "catalogo"} className={view === "catalogo" ? styles.activeTab : ""} onClick={() => setView("catalogo")}>Catálogo <span>{meta.total}</span></button>
      <button type="button" role="tab" aria-selected={view === "aulas"} className={view === "aulas" ? styles.activeTab : ""} onClick={() => setView("aulas")}>Instalación por aulas <span>{coveredRooms}</span></button>
    </div>

    {view === "catalogo" && <CatalogView rooms={rooms} software={visibleSoftware} assignments={assignments} searchText={searchText} roomFilter={roomFilter} onSearchText={setSearchText} onSearch={() => { setQuery(searchText); setPage(1); }} onRoomFilter={setRoomFilter} onEdit={setEditor} onDelete={deleteSoftware} meta={meta} onPage={setPage} />}
    {view === "aulas" && <RoomsSoftwareView software={roomSoftware} assignments={roomAssignments} selected={requiredSoftware} matchingRooms={rooms.filter((room) => { const normalized = roomSearchText.trim().toLocaleLowerCase("es"); const matchesSearch = !normalized || (room.code + " " + (room.location ?? "")).toLocaleLowerCase("es").includes(normalized); const matchesSoftware = requiredSoftware.every((softwareId) => roomAssignments.some((assignment) => assignment.roomId === room.id && assignment.softwareId === softwareId)); return matchesSearch && matchesSoftware; })} roomSearchText={roomSearchText} onRoomSearchText={setRoomSearchText} onToggle={(id) => setRequiredSoftware((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onClear={() => setRequiredSoftware([])} onRemove={removeAssignment} />}
    {editor === "new" && <NewSoftwareDialog rooms={rooms} onClose={() => setEditor(null)} onSave={saveSoftware} />}
    {editor && editor !== "new" && <SoftwareDialog item={editor} onClose={() => setEditor(null)} onSave={saveSoftware} />}
    {showImport && <ImportDialog onClose={() => setShowImport(false)} onImport={importExcel} />}
    {importResult && <ImportResultDialog result={importResult} onClose={() => setImportResult(null)} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function CatalogView({ rooms, software, assignments, searchText, roomFilter, onSearchText, onSearch, onRoomFilter, onEdit, onDelete, meta, onPage }: { rooms: Room[]; software: InstalledSoftware[]; assignments: SoftwareAssignment[]; searchText: string; roomFilter: string; onSearchText: (value: string) => void; onSearch: () => void; onRoomFilter: (value: string) => void; onEdit: (item: InstalledSoftware) => void; onDelete: (item: InstalledSoftware) => Promise<void>; meta: { page: number; total: number; totalPages: number }; onPage: (page: number) => void }) {
  return <section className={styles.contentCard}><div className={styles.toolbar}><form className={styles.search} onSubmit={(event) => { event.preventDefault(); onSearch(); }}><span aria-hidden="true">⌕</span><input value={searchText} onChange={(event) => onSearchText(event.target.value)} placeholder="Buscar por nombre, versión o descripción..." aria-label="Buscar software" /><button type="submit">Buscar</button></form><label><span>Aula</span><select value={roomFilter} onChange={(event) => onRoomFilter(event.target.value)}><option value="todas">Todas las aulas</option>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code}</option>)}</select></label><span className={styles.resultCount}>{software.length} resultado(s)</span></div><div className="table-wrap"><table className={styles.softwareTable}><thead><tr><th>Software</th><th>Versión</th><th>Estado</th><th>Descripción</th><th>Aulas instaladas</th><th>Distribución</th><th>Acciones</th></tr></thead><tbody>{software.map((item) => {
    const itemAssignments = assignments.filter((assignment) => assignment.softwareId === item.id);
    const status = item.status ?? "ACTIVO";
    return <tr key={item.id}><td><strong>{item.name}</strong><small>{item.id.slice(0, 13)}…</small></td><td><code>{item.version}</code></td><td><span className={styles.softwareStatus}>{softwareStatusLabels[status]}</span></td><td><span className={styles.description}>{item.description || "Sin descripción"}</span></td><td><strong>{itemAssignments.length}</strong><small>asociación(es)</small></td><td><div className={styles.roomTags}>{itemAssignments.slice(0, 4).map((assignment) => <span key={assignment.roomId}>{rooms.find((room) => room.id === assignment.roomId)?.code}</span>)}{itemAssignments.length > 4 && <b>+{itemAssignments.length - 4}</b>}{itemAssignments.length === 0 && <em>Sin instalar</em>}</div></td><td><div className={styles.actions}><button type="button" onClick={() => onEdit(item)}>Editar</button><button type="button" className={styles.deleteButton} onClick={() => void onDelete(item)}>Eliminar</button></div></td></tr>;
  })}{software.length === 0 && <tr><td colSpan={7} className={styles.emptyTable}>No hay software para los filtros seleccionados.</td></tr>}</tbody></table></div><footer className={styles.pagination}><span>Página {meta.page} de {meta.totalPages || 1}</span><div><button type="button" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Anterior</button><button type="button" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Siguiente</button></div></footer></section>;
}

function RoomsSoftwareView({ software, assignments, selected, matchingRooms, roomSearchText, onRoomSearchText, onToggle, onClear, onRemove }: { software: InstalledSoftware[]; assignments: SoftwareAssignment[]; selected: string[]; matchingRooms: Room[]; roomSearchText: string; onRoomSearchText: (value: string) => void; onToggle: (id: string) => void; onClear: () => void; onRemove: (assignment: SoftwareAssignment) => Promise<void> }) {
  const [softwareSearchText, setSoftwareSearchText] = useState("");
  const filteredSoftware = useMemo(() => {
    const normalized = softwareSearchText.trim().toLocaleLowerCase("es");
    if (!normalized) return software;
    return software.filter((item) => `${item.name} ${item.version}`.toLocaleLowerCase("es").includes(normalized));
  }, [software, softwareSearchText]);

  return <section className={styles.roomsLayout}><aside className={styles.requirements}><header><div><span>Búsqueda combinada</span><h2>Aulas por software</h2></div>{selected.length > 0 && <button type="button" onClick={onClear}>Limpiar</button>}</header><p>Seleccione uno o varios programas. Solo aparecerán aulas que tengan instalados todos los seleccionados.</p><label className={styles.requirementSearch}><span aria-hidden="true">⌕</span><input value={softwareSearchText} onChange={(event) => setSoftwareSearchText(event.target.value)} placeholder="Buscar por nombre o versión" aria-label="Filtrar software para búsqueda combinada" /></label><div className={styles.selectionSummary}>{filteredSoftware.length} de {software.length} software(s){selected.length > 0 && <> · {selected.length} seleccionado(s)</>}</div><div className={styles.softwareSelectionList}>{filteredSoftware.map((item) => <label key={item.id} className={selected.includes(item.id) ? styles.selectedRequirement : ""}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} /><span><strong>{item.name}</strong><small>{item.version}</small></span></label>)}{filteredSoftware.length === 0 && <p className={styles.noSoftwareMatch}>No se encontraron programas con ese nombre o versión.</p>}</div></aside><div className={styles.roomsResult}><header><div><h2>{selected.length ? "Aulas compatibles" : "Inventario por aula"}</h2><p>{selected.length ? matchingRooms.length + " aula(s) contienen los " + selected.length + " programas seleccionados." : "Busque un aula o seleccione programas para cruzar requisitos."}</p></div><span>{matchingRooms.length} resultados</span></header><label className={styles.roomSearch}><span aria-hidden="true">⌕</span><input value={roomSearchText} onChange={(event) => onRoomSearchText(event.target.value)} placeholder="Buscar aula por código o ubicación" aria-label="Buscar aula instalada" /></label><div className={styles.roomGrid}>{matchingRooms.map((room) => {
    const roomAssignments = assignments.filter((assignment) => assignment.roomId === room.id);
    return <article key={room.id}><header><div><strong>Aula {room.code}</strong><small>{room.location}</small></div><b>{roomAssignments.length} programas</b></header><div>{roomAssignments.map((assignment) => {
      const item = software.find((softwareItem) => softwareItem.id === assignment.softwareId);
      return item && <span key={assignment.softwareId}><i><strong>{item.name}</strong><small>{item.version} · Instalado {assignment.installedAt}</small></i><button type="button" onClick={() => void onRemove(assignment)} aria-label={"Retirar " + item.name + " del aula " + room.code}>×</button></span>;
    })}{roomAssignments.length === 0 && <p>Sin software asociado en el inventario.</p>}</div></article>;
  })}</div></div></section>;
}

function NewSoftwareDialog({ rooms, onClose, onSave }: { rooms: Room[]; onClose: () => void; onSave: (payload: Omit<InstalledSoftware, "id">, id?: string, aulaId?: string, installedAt?: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [aulaId, setAulaId] = useState("");
  const [installedAt, setInstalledAt] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void onSave(
      { name: name.trim(), version: version.trim(), description: description.trim() || undefined },
      undefined,
      aulaId || undefined,
      installedAt || undefined,
    );
  };

  return <DialogShell title="Nuevo software" subtitle="Catálogo de software" description="Registre el software y, si corresponde, asígnelo a un aula." onClose={onClose}>
    <form onSubmit={submit} className={styles.dialogForm}>
      <div className={styles.formGrid}>
        <label><span>Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} required autoFocus placeholder="Ej. AutoCAD" /></label>
        <label><span>Versión</span><input value={version} onChange={(event) => setVersion(event.target.value)} required placeholder="Ej. 2025" /></label>
        <label className={styles.wideField}><span>Descripción <small>Opcional</small></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Uso principal o información relevante..." /></label>
        <label><span>Aula <small>Opcional</small></span><select value={aulaId} onChange={(event) => setAulaId(event.target.value)}><option value="">No asignar aula ahora</option>{rooms.map((room) => <option key={room.id} value={room.id}>Aula {room.code}</option>)}</select></label>
        <label><span>Fecha de instalación <small>Opcional</small></span><input type="date" value={installedAt} onChange={(event) => setInstalledAt(event.target.value)} disabled={!aulaId} /></label>
      </div>
      <footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary">Crear software</button></footer>
    </form>
  </DialogShell>;
}

function SoftwareDialog({ item, onClose, onSave }: { item?: InstalledSoftware; onClose: () => void; onSave: (payload: Omit<InstalledSoftware, "id">, id?: string) => Promise<boolean> }) {
  const [name, setName] = useState(item?.name ?? "");
  const [version, setVersion] = useState(item?.version ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [status, setStatus] = useState<keyof typeof softwareStatusLabels>(item?.status ?? "ACTIVO");
  const submit = (event: React.FormEvent) => { event.preventDefault(); void onSave({ name: name.trim(), version: version.trim(), description: description.trim() || undefined, status }, item?.id); };
  return <DialogShell title={item ? "Editar software" : "Nuevo software"} subtitle="Catálogo de software" description="Nombre y versión identifican de forma única el registro." onClose={onClose}><form onSubmit={submit} className={styles.dialogForm}><div className={styles.formGrid}><label><span>Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} required autoFocus placeholder="Ej. AutoCAD" /></label><label><span>Versión</span><input value={version} onChange={(event) => setVersion(event.target.value)} required placeholder="Ej. 2025" /></label>{item && <label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value as keyof typeof softwareStatusLabels)}>{Object.entries(softwareStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}<label className={styles.wideField}><span>Descripción <small>Opcional</small></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Uso principal o información relevante..." /></label></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary">{item ? "Guardar cambios" : "Crear software"}</button></footer></form></DialogShell>;
}

function AssignmentDialog({ rooms, software, assignments, onClose, onAssign }: { rooms: Room[]; software: InstalledSoftware[]; assignments: SoftwareAssignment[]; onClose: () => void; onAssign: (assignment: SoftwareAssignment) => Promise<boolean> }) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [softwareId, setSoftwareId] = useState(software[0]?.id ?? "");
  const [installedAt, setInstalledAt] = useState("2026-08-25");
  const duplicate = assignments.some((item) => item.roomId === roomId && item.softwareId === softwareId);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!duplicate && roomId && softwareId) void onAssign({ roomId, softwareId, installedAt }); };
  return <DialogShell title="Asignar software a un aula" subtitle="Nueva instalación" description="El aula y el software deben existir previamente en sus catálogos." onClose={onClose}><form onSubmit={submit} className={styles.dialogForm}><div className={styles.formGrid}><label><span>Aula</span><select value={roomId} onChange={(event) => setRoomId(event.target.value)}><option value="">Seleccionar aula</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}</select></label><label><span>Software</span><select value={softwareId} onChange={(event) => setSoftwareId(event.target.value)}><option value="">Seleccionar software</option>{software.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.version}</option>)}</select></label><label className={styles.wideField}><span>Fecha de instalación <small>Opcional en el backend</small></span><input type="date" value={installedAt} onChange={(event) => setInstalledAt(event.target.value)} /></label></div>{duplicate && <div className={styles.inlineError}>El software ya está asociado con el aula seleccionada.</div>}<footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={duplicate || !softwareId || !roomId}>Guardar asociación</button></footer></form></DialogShell>;
}

function ImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (archivo: File) => Promise<void> }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!archivo) return; setSending(true); try { await onImport(archivo); } finally { setSending(false); } };
  return <DialogShell title="Cargar software masivamente" subtitle="Importación desde Excel" description="Use un archivo .xlsx o .xls con las columnas Aula, Software y Software Versión. Cada fila se asociará con el aula ya registrada." onClose={onClose}><form onSubmit={(event) => void submit(event)} className={styles.dialogForm}><div className={styles.formGrid}><label className={styles.wideField}><span>Archivo de Excel</span><input type="file" accept=".xlsx,.xls" required onChange={(event) => setArchivo(event.target.files?.[0] ?? null)} /></label></div><div className={styles.importPreview}><strong>{archivo ? archivo.name : "Seleccione un archivo"}</strong><span>Las filas con aulas inexistentes o datos incompletos se reportarán sin impedir el resto de la carga.</span></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose} disabled={sending}>Cancelar</button><button type="submit" className="button-primary" disabled={!archivo || sending}>{sending ? "Cargando…" : "Importar Excel"}</button></footer></form></DialogShell>;
}

function ImportResultDialog({ result, onClose }: { result: ResultadoImportacionSoftwareExcel; onClose: () => void }) {
  const { resumen, errores } = result;
  return <DialogShell title="Resultado de la carga masiva" subtitle={resumen.resultado} description={`${resumen.registrosProcesados} de ${resumen.totalRegistros} filas fueron asociadas.`} onClose={onClose}><div className={styles.dialogForm}><div className={styles.importPreview}><strong>{resumen.registrosConError} fila(s) con error</strong><span>{resumen.reemplazoAplicado ? `Se reemplazaron ${resumen.asociacionesReemplazadas} asociación(es) anterior(es) que no estaban en el archivo.` : "No se reemplazó información anterior porque el archivo contiene errores."}</span></div>{errores.length > 0 && <div className={styles.inlineError}><strong>Detalle de errores</strong><ul>{errores.slice(0, 12).map((error) => <li key={`${error.fila}-${error.aulaCodigo}-${error.nombre}`}>Fila {error.fila}: {error.error}</li>)}</ul>{errores.length > 12 && <small>Se muestran los primeros 12 errores de {errores.length}.</small>}</div>}<footer><button type="button" className="button-primary" onClick={onClose}>Entendido</button></footer></div></DialogShell>;
}

function DialogShell({ title, subtitle, description, onClose, children }: { title: string; subtitle: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}><header><div><span>{subtitle}</span><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header>{children}</section></div>;
}

