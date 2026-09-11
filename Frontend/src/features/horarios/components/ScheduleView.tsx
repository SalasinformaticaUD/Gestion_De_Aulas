"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { obtenerSesion, tienePermiso } from "@/features/auth/lib/sesion";
import { listarAulas } from "@/features/aulas/api/aulasApi";
import { descargarFichasAsistenciaMes, importarHorarioExcel, iniciarSemestre, listarClases, listarPeriodos, registrarAsistencia, type ClaseApi, type Periodo, type ResultadoImportacionExcel } from "@/features/horarios/api/horariosApi";
import { MonthlyPdfDialog } from "@/components/documents/MonthlyPdfDialog";
import styles from "./ScheduleView.module.css";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const blocks = ["06:00 - 08:00", "08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00", "14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00", "20:00 - 22:00"];
type ClassEntry = { subject: string; teacher: string; tone: string; room?: string };
type ClassMap = Record<string, ClassEntry>;

const initialClasses: ClassMap = {};

function slotKey(block: string, day: string, room: string) {
  return `${block}-${day}-${room}`;
}

function isAdmin() { return obtenerSesion()?.usuario.roles.some((rol) => rol.toUpperCase() === "ADMINISTRADOR") ?? false; }
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value.slice(0, 5) : new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(date); }
function formatDate(date: Date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }
function moveDate(value: string, amount: number) { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + amount); return formatDate(date); }
function mondayOf(date: Date) { const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate()); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); return monday; }
function weekRange(fechaInicio: string | undefined, selectedWeek: number, currentWeek: number) { const base = fechaInicio ? mondayOf(new Date(`${fechaInicio.slice(0, 10)}T00:00:00`)) : (() => { const today = new Date(); const currentMonday = mondayOf(today); currentMonday.setDate(currentMonday.getDate() + (selectedWeek - currentWeek) * 7); return currentMonday; })(); base.setDate(base.getDate() + (selectedWeek - 1) * 7); const end = new Date(base); end.setDate(end.getDate() + 6); return { start: base, end }; }
function occurrenceDate(day: number, selectedWeek: number, currentWeek: number, fechaInicio?: string) { const { start } = weekRange(fechaInicio, selectedWeek, currentWeek); start.setDate(start.getDate() + day - 1); return formatDate(start); }
function attendanceIsOpen(fecha: string, horaInicio: string) { const occurrence = new Date(`${fecha}T00:00:00`); const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); if (occurrence.getTime() === yesterday.getTime()) return true; if (occurrence.getTime() !== today.getTime()) return false; const start = new Date(horaInicio); const startMinutes = start.getUTCHours() * 60 + start.getUTCMinutes(); return now.getHours() * 60 + now.getMinutes() >= startMinutes; }
function semesterWeek(fechaInicio?: string, fechaFin?: string) {
  if (!fechaInicio) return 1;
  const inicio = new Date(`${fechaInicio.slice(0, 10)}T00:00:00`);
  const hoy = new Date();
  inicio.setHours(0, 0, 0, 0);
  hoy.setHours(0, 0, 0, 0);
  const maxWeeks = semesterWeeks(fechaInicio, fechaFin);
  return Math.min(maxWeeks, Math.max(1, Math.floor((hoy.getTime() - inicio.getTime()) / 86400000 / 7) + 1));
}
function semesterWeeks(fechaInicio?: string, fechaFin?: string) { if (!fechaInicio || !fechaFin) return 26; const inicio = new Date(`${fechaInicio.slice(0, 10)}T00:00:00`); const fin = new Date(`${fechaFin.slice(0, 10)}T00:00:00`); return Math.max(1, Math.ceil((fin.getTime() - inicio.getTime() + 86400000) / 604800000)); }
function blockLabel(item: ClaseApi) { return `${formatTime(item.horaInicio)} - ${formatTime(item.horaFin)}`; }
function blockMinutes(block: string) { const [inicio] = block.split(" - "); const [hours, minutes] = inicio.split(":").map(Number); return hours * 60 + minutes; }
const scheduleTemplateRows = [["Periodo", "Dia", "Hora", "Cap", "Salon", "Grupo", "Asignatura", "Proyecto", "id", "Docente", "Inscritos2"], ["2026-3", "LUNES", "6AM", 20, "AULA 306 CAP(20)", "025-63", "2 - PROGRAMACION BASICA", "5 - INGENIERIA ELECTRONICA", "AULA 306 6AM LUNES", "ROBERTO ALBEIRO PAVA DIAZ", 16], ["2026-3", "LUNES", "8AM", 20, "AULA 306 CAP(20)", "015-23", "132 - INGENIERIA DE METODOS Y TIEMPOS", "15 - INGENIERIA INDUSTRIAL", "AULA 306 8AM LUNES", "FLOR DE MARIA GUTIERREZ", 20], ["2026-3", "LUNES", "10AM", 22, "AULA 312 CAP(22)", "100-01", "700003020 - PROYECTO DE INVESTIGACION II", "700 - PROGRAMA DE INGENIERIA", "AULA 312 10AM LUNES", "HENRY ALBERTO DIOSA", 4], ["2026-3", "MARTES", "2PM", 20, "AULA 306 CAP(20)", "005-5", "8 - HISTORIA Y CULTURA COLOMBIANA", "5 - INGENIERIA ELECTRONICA", "AULA 306 2PM MARTES", "ALBERTO FRANCISCO RUANO MIRANDA", 34], ["2026-3", "MIERCOLES", "4PM", 22, "AULA 312 CAP(22)", "015-21", "174 - ESTRUCTURAMENTAL Y COMPORTAMIENTOS", "15 - INGENIERIA INDUSTRIAL", "AULA 312 4PM MIERCOLES", "HELVER RICARDO TOCASUCHE GONZALEZ", 29], ["2026-3", "JUEVES", "6PM", 20, "AULA 306 CAP(20)", "015-21", "182 - PROGRAMACION NO LINEAL", "15 - INGENIERIA INDUSTRIAL", "AULA 306 6PM JUEVES", "EDUIN RAMIRO LOPEZ SANTANA", 18], ["2026-3", "VIERNES", "8AM", 22, "AULA 312 CAP(22)", "025-63", "410 - PROGRAMACION AVANZADA", "25 - INGENIERIA DE SISTEMAS", "AULA 312 8AM VIERNES", "MARIA FERNANDA TORRES", 21]];
function downloadScheduleTemplate() {
  const rows = scheduleTemplateRows;
  const hoja = XLSX.utils.aoa_to_sheet(rows);
  hoja["!cols"] = rows[0].map((header) => ({ wch: Math.max(String(header).length + 2, 18) }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Horario");
  const contenido = XLSX.write(libro, { bookType: "xlsx", type: "array" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([contenido], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  enlace.download = "plantilla-horarios.xlsx";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export function ScheduleView() {
  const [rooms, setRooms] = useState<string[]>([]);
  const [roomIds, setRoomIds] = useState<Record<string, string>>({});
  const [periodoId, setPeriodoId] = useState("");
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [allRooms, setAllRooms] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [classes, setClasses] = useState<ClassMap>(initialClasses);
  const [rows, setRows] = useState<ClaseApi[]>([]);
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);
  const [showMonthlyPdf, setShowMonthlyPdf] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<ResultadoImportacionExcel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const classesCache = useRef(new Map<string, ClaseApi[]>());

  useEffect(() => { void Promise.all([listarAulas(), listarPeriodos()]).then(([aulas, loadedPeriods]) => { const codes = aulas.map((aula) => aula.code); setRooms(codes); setRoomIds(Object.fromEntries(aulas.map((aula) => [aula.code, aula.id]))); setPeriodos(loadedPeriods); setPeriodoId((loadedPeriods.find((periodo) => periodo.activo) ?? loadedPeriods[0])?.id ?? ""); }).catch((cause) => setError(cause instanceof Error ? cause.message : "No fue posible cargar las aulas o períodos.")); }, []);
  const periodo = periodos.find((item) => item.id === periodoId);
  const canCreateSchedule = tienePermiso("HORARIOS_CREAR");
  const loadClasses = async (force = false) => { if (!periodoId) return; try { const cacheKey = `${periodoId}:${selectedDate}`; const cached = !force ? classesCache.current.get(cacheKey) : undefined; const data = cached ?? await listarClases(periodoId, selectedDate); if (!cached) classesCache.current.set(cacheKey, data); setRows(data); const mapped: ClassMap = {}; data.forEach((item) => { const day = days[item.diaSemana - 1]; const start = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(item.horaInicio)); const end = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(item.horaFin)); const code = item.aula?.codigo ?? Object.entries(roomIds).find(([, id]) => id === item.aulaId)?.[0]; if (day && code) mapped[slotKey(`${start} - ${end}`, day, code)] = { subject: item.asignatura.nombre, teacher: item.docente.nombre, tone: "info", room: code }; }); setClasses(mapped); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar clases."); } };
  // La recarga depende del período y del catálogo de aulas; loadClasses se recrea por render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadClasses(); const timer = window.setInterval(() => { void loadClasses(true); }, 30_000); return () => window.clearInterval(timer); }, [periodoId, roomIds, selectedDate]);
  const blocksForView = Array.from(new Set(rows.map(blockLabel))).sort((a, b) => blockMinutes(a) - blockMinutes(b));
  // La importación puede no contener clases en alguno de los bloques. El
  // selector debe conservar la jornada completa, especialmente 12:00-14:00,
  // y sumar bloques extraordinarios que vengan en el archivo.
  const availableBlocks = Array.from(new Set([...blocks, ...blocksForView])).sort((a, b) => blockMinutes(a) - blockMinutes(b));
  const visibleRows = rows
    .filter((item) => (!blockFilter || blockLabel(item) === blockFilter) && (!roomFilter || item.aula?.codigo === roomFilter) && (allRooms || !roomFilter || item.aula?.codigo === roomFilter) && (!search || `${item.aula?.codigo} ${item.grupo} ${item.asignatura?.nombre} ${item.docente?.nombre} ${item.proyectoCurricular?.nombre ?? ""}`.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => (a.aula?.codigo ?? "").localeCompare(b.aula?.codigo ?? "", "es"));
  const maxWeeks = semesterWeeks(periodo?.fechaInicio, periodo?.fechaFin);
  const guardarAsistencia = async (claseId: string, fecha: string, estado: "ASISTIO" | "AUSENTE") => { setSavingAttendance(claseId); setError(null); try { await registrarAsistencia(claseId, fecha, estado); classesCache.current.delete(`${periodoId}:${fecha}`); await loadClasses(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible registrar la asistencia."); } finally { setSavingAttendance(null); } };
  const generarSigud = async (mes: string) => { const blob = await descargarFichasAsistenciaMes(mes); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `Fichas_Asistencia_SIGUD_${mes}.zip`; link.click(); URL.revokeObjectURL(url); const message = "Las fichas de asistencia del mes se generaron en un archivo ZIP."; setSuccess(message); window.setTimeout(() => setSuccess((current) => current === message ? null : current), 10_000); };

  return (
    <>
      <section className="page-heading"><div><h1>Horarios académicos</h1><p>Consulta diaria de la programación por aula · {periodo ? `Período ${periodo.nombre}` : "Seleccione un período académico"}.</p></div><div className={styles.headingActions}><button type="button" className="button-secondary" onClick={() => setShowMonthlyPdf(true)}>Generar fichas PDF</button><span className="live-status">{periodo ? (periodo.activo ? "Período activo" : "Período seleccionado") : "Sin período"}</span></div></section>
      <section className="filters" aria-label="Filtros de horario">
        <label className="field">Período<select value={periodoId} onChange={(event) => setPeriodoId(event.target.value)}><option value="">{periodos.length ? "Seleccionar período" : "No hay períodos creados"}</option>{periodos.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.activo ? " · Activo" : ""}</option>)}</select></label>
        <label className="field">Fecha<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><div className={styles.dateControls}><button type="button" className="button-secondary" onClick={() => setSelectedDate(moveDate(selectedDate, -1))}>← Anterior</button><button type="button" className="button-secondary" onClick={() => setSelectedDate(formatDate(new Date()))}>Hoy</button><button type="button" className="button-secondary" onClick={() => setSelectedDate(moveDate(selectedDate, 1))}>Siguiente →</button></div>
        {isAdmin() && <button className="button-secondary" type="button" onClick={() => setIsPeriodModalOpen(true)}>+ Iniciar semestre</button>}{canCreateSchedule && <label className="button-secondary"><input type="file" accept=".xlsx,.xls" hidden onChange={async (event) => { const archivo = event.target.files?.[0]; if (!archivo || !periodoId) return; setUploading(true); setError(null); setSuccess(null); try { const resultado = await importarHorarioExcel(periodoId, archivo, true); classesCache.current.clear(); setImportSummary(resultado); setSuccess(`Carga completa: ${resultado.creados + resultado.actualizados} filas registradas.`); window.setTimeout(() => setSuccess(null), 15000); await loadClasses(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar el Excel."); } finally { setUploading(false); event.target.value = ""; } }} />{uploading ? "Cargando…" : "Importar Excel"}</label>}<button className="button-secondary" type="button" onClick={downloadScheduleTemplate}>Descargar plantilla Excel</button>
      </section>
      {success && <p className="auth-feedback auth-feedback-success" role="status">{success}</p>}
      {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
      {importSummary && <ImportSummaryModal result={importSummary} onClose={() => setImportSummary(null)} />}
      <section className="card"><header className="card-header"><div><h2>Consulta de horarios</h2><p>Clases de la fecha seleccionada por hora, aula, grupo, asignatura, proyecto y docente.</p></div><span>{visibleRows.length} registros · {selectedDate}</span></header>
        <div className="filters"><label className="field">Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Asignatura, docente o grupo" /></label><label className="field">Bloque<select value={blockFilter} onChange={(event) => setBlockFilter(event.target.value)}><option value="">Todos</option>{availableBlocks.map((block) => <option key={block} value={block}>{block}</option>)}</select></label><label className="field">Aula<select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}><option value="">Todas</option>{rooms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
        <div className="table-wrap"><table className="schedule schedule-list"><thead><tr><th>Día</th><th>Hora</th><th>Aula</th><th>Grupo</th><th>Asignatura</th><th>Proyecto</th><th>Docente</th><th>Asistencia</th></tr></thead><tbody>{visibleRows.map((item) => { const asistencia = item.asistencias?.find((registro) => registro.fecha.slice(0, 10) === selectedDate); const abierta = attendanceIsOpen(selectedDate, item.horaInicio); return <tr key={item.id}><td>{days[item.diaSemana - 1]}</td><td>{formatTime(item.horaInicio)} – {formatTime(item.horaFin)}</td><td>{item.aula?.codigo ?? "—"}</td><td>{item.grupo}</td><td><strong>{item.asignatura?.nombre ?? "—"}</strong></td><td>{item.proyectoCurricular?.nombre ?? "—"}</td><td>{item.docente?.nombre ?? "—"}</td><td><span className={`attendance-state attendance-${asistencia?.estado?.toLowerCase() ?? "pendiente"}`}>{asistencia?.estado === "ASISTIO" ? "Asistió" : asistencia?.estado === "AUSENTE" ? "No asistió" : "Pendiente"}</span><small className="attendance-help">Fecha: {selectedDate}{!abierta && " · Fuera de plazo o bloque futuro"}</small><div className="attendance-actions"><button type="button" className="attendance-check" aria-label="Asistió" disabled={!abierta || savingAttendance === item.id} onClick={() => void guardarAsistencia(item.id, selectedDate, "ASISTIO")}>✓</button><button type="button" className="attendance-cross" aria-label="No asistió" disabled={!abierta || savingAttendance === item.id} onClick={() => void guardarAsistencia(item.id, selectedDate, "AUSENTE")}>✕</button></div></td></tr>; })}{!visibleRows.length && <tr><td colSpan={8}>No hay clases para los filtros seleccionados.</td></tr>}</tbody></table></div>
      </section>
      {isPeriodModalOpen && (
        <PeriodModal
          onClose={() => setIsPeriodModalOpen(false)}
          onCreate={async (input) => {
            try {
              const created = await iniciarSemestre(input);
              const loadedPeriods = await listarPeriodos();
              setPeriodos(loadedPeriods);
              setPeriodoId(created.id);
              setIsPeriodModalOpen(false);
              setSuccess("Semestre iniciado correctamente.");
              window.setTimeout(() => setSuccess(null), 5000);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "No fue posible iniciar el semestre.");
            }
          }}
        />
      )}
      {showMonthlyPdf && <MonthlyPdfDialog title="Fichas de asistencia SIGUD" description="Se descargará un ZIP con los formatos diarios que tengan asistencia registrada en el mes." onClose={() => setShowMonthlyPdf(false)} onGenerate={generarSigud} />}
    </>
  );
}

function ImportSummaryModal({ result, onClose }: { result: ResultadoImportacionExcel; onClose: () => void }) {
  const titleId = useId();
  const warnings = result.advertencias ?? [];
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="audiovisual-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}><header><div><h2 id={titleId}>Resultado de la importación</h2><p>El archivo fue procesado. Revise el resumen antes de continuar.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><div className="dialog-grid"><div className="dialog-field"><span>Filas procesadas</span><strong>{result.procesados}</strong></div><div className="dialog-field"><span>Clases registradas</span><strong>{result.creados + result.actualizados}</strong><small>{result.creados} creadas · {result.actualizados} actualizadas</small></div><div className="dialog-field"><span>Filas con error</span><strong>{result.rechazados}</strong></div><div className="dialog-field"><span>Reemplazadas</span><strong>{result.eliminadosPorReemplazo}</strong></div></div>{warnings.length > 0 && <div className="auth-feedback auth-feedback-success"><strong>{warnings.length} clase(s) registrada(s) sin docente.</strong><br />Se mostrará “Información no disponible” en esos horarios.</div>}{result.detallesRechazados.length > 0 && <div className="auth-feedback auth-feedback-error"><strong>Filas que no se pudieron registrar</strong><ul>{result.detallesRechazados.slice(0, 10).map((item) => <li key={`${item.fila}-${item.motivo}`}>Fila {item.fila}: {item.motivo}</li>)}</ul>{result.detallesRechazados.length > 10 && <small>Se muestran las primeras 10 de {result.detallesRechazados.length} filas con error.</small>}</div>}<footer><button type="button" className="button-primary" onClick={onClose}>Entendido</button></footer></section></div>;
}

function PeriodModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: { nombre: string; fechaInicio: string; fechaFin: string; passwordConfirmacion: string }) => Promise<void> }) {
  const titleId = useId();
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const canSubmit = Boolean(nombre.trim() && fechaInicio && fechaFin && fechaInicio <= fechaFin && passwordConfirmacion);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.modalHeader}>
          <div><h2 id={titleId}>Iniciar nuevo semestre</h2><p>Esta acción crea y activa el período para todo el horario.</p></div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); if (canSubmit) void onCreate({ nombre: nombre.trim(), fechaInicio, fechaFin, passwordConfirmacion }); }}>
          <label className={styles.field}>Nombre del semestre<input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. 2026-2" required /></label>
          <div className={styles.row}>
            <label className={styles.field}>Fecha de inicio<input type="date" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} required /></label>
            <label className={styles.field}>Fecha de finalización<input type="date" value={fechaFin} min={fechaInicio} onChange={(event) => setFechaFin(event.target.value)} required /></label>
          </div>
          {fechaInicio && fechaFin && fechaInicio > fechaFin && <p className={styles.conflict}>La fecha de finalización no puede ser anterior a la de inicio.</p>}
          <label className={styles.field}>Contraseña de confirmación<input type="password" value={passwordConfirmacion} onChange={(event) => setPasswordConfirmacion(event.target.value)} autoComplete="current-password" required /></label>
          <p className={styles.hint}>El semestre se crea activo y la contraseña del administrador se valida antes de confirmar la acción.</p>
          <div className={styles.actions}><button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!canSubmit}>Iniciar y seleccionar</button></div>
        </form>
      </div>
    </div>
  );
}
