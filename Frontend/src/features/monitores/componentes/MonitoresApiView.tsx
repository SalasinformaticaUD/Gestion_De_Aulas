"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { adaptarMonitor } from "@/features/monitores/api/adaptadoresMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import type { MonitorApi } from "@/features/monitores/api/contratosMonitores";
import estilos from "./SistemaVisualMonitores.module.css";

const vacio = { full_name: "", codigo_estudiante: "", email: "", username: "", department: "informatics_labs", numero_documento: "", proyecto_curricular: "", telefono: "" };

export function MonitoresApiView() {
  const [rows, setRows] = useState<MonitorApi[]>([]);
  const [form, setForm] = useState(vacio);
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true); setError("");
    try { setRows(await servicioMonitores.listarMonitores()); }
    catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar los monitores."); }
    finally { setCargando(false); }
  }
  useEffect(() => { void cargar(); }, []);

  const visibles = useMemo(() => rows.filter((item) => {
    const texto = `${item.full_name} ${item.codigo_estudiante} ${item.user_email ?? ""}`.toLocaleLowerCase("es");
    return (!buscar || texto.includes(buscar.toLocaleLowerCase("es"))) && (estado === "TODOS" || (estado === "ACTIVOS" ? item.is_active : !item.is_active));
  }), [rows, buscar, estado]);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setGuardando(true); setError(""); setAviso("");
    try { const creado = await servicioMonitores.provisionarMonitor(form); setRows((actual) => [creado, ...actual]); setForm(vacio); setAviso("Monitor registrado correctamente en la API."); }
    catch (e) { setError(e instanceof Error ? e.message : "No fue posible registrar el monitor."); }
    finally { setGuardando(false); }
  }
  async function alternar(item: MonitorApi) {
    try { const actualizado = await servicioMonitores.actualizarMonitor(item.id, { is_active: !item.is_active }); setRows((actual) => actual.map((row) => row.id === item.id ? actualizado : row)); }
    catch (e) { setError(e instanceof Error ? e.message : "No fue posible actualizar el estado."); }
  }

  return <div className={estilos.gestionCuentas}>
    <section className={`page-heading ${estilos.encabezado}`}><div><span className={estilos.etiqueta}>Gestión académica</span><h1>Monitores</h1><p>Registre y administre monitores directamente sobre la API de Monitores.</p></div><button type="button" className={estilos.botonSecundario} onClick={() => void cargar()} disabled={cargando}>Actualizar</button></section>
    <section className={estilos.metricas}><article className={`${estilos.metrica} ${estilos.violeta}`}><span>Total</span><strong>{rows.length}</strong><small>Registros en la API</small></article><article className={`${estilos.metrica} ${estilos.verde}`}><span>Activos</span><strong>{rows.filter((item) => item.is_active).length}</strong><small>Disponibles para gestión</small></article><article className={`${estilos.metrica} ${estilos.ambar}`}><span>Inactivos</span><strong>{rows.filter((item) => !item.is_active).length}</strong><small>Sin operación vigente</small></article><article className={`${estilos.metrica} ${estilos.azul}`}><span>Visibles</span><strong>{visibles.length}</strong><small>Según filtros actuales</small></article></section>
    {error && <div className={`${estilos.aviso} ${estilos.avisoError}`} role="alert">{error}</div>}{aviso && <div className={`${estilos.aviso} ${estilos.avisoExito}`} role="status">{aviso}</div>}
    <div className={estilos.distribucionFormulario}><section className={`${estilos.tarjeta} ${estilos.formularioFijo}`}><header><div><h2>Registrar monitor</h2><p>Los datos se guardan en el backend y pueden vincularse con un usuario central.</p></div></header><form className={estilos.formulario} onSubmit={crear}><label className={estilos.campo}><span>Nombre completo</span><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label><label className={estilos.campo}><span>Código estudiantil</span><input required value={form.codigo_estudiante} onChange={(e) => setForm({ ...form, codigo_estudiante: e.target.value })} /></label><label className={estilos.campo}><span>Correo institucional</span><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className={estilos.campo}><span>Usuario central (opcional)</span><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label><div className={estilos.formularioDoble}><label className={estilos.campo}><span>Documento</span><input value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} /></label><label className={estilos.campo}><span>Teléfono</span><input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label></div><label className={estilos.campo}><span>Dependencia</span><select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="informatics_labs">Aulas de Software</option><option value="physics">Física</option><option value="electrical">Laboratorios</option></select></label><label className={estilos.campo}><span>Proyecto curricular</span><select value={form.proyecto_curricular} onChange={(e) => setForm({ ...form, proyecto_curricular: e.target.value })}><option value="">Sin especificar</option><option value="ingenieria_electronica">Ingeniería electrónica</option><option value="ingenieria_sistemas">Ingeniería de sistemas</option><option value="ingenieria_electrica">Ingeniería eléctrica</option><option value="ingenieria_catastral">Ingeniería catastral</option><option value="ingenieria_industrial">Ingeniería industrial</option><option value="licenciatura_fisica">Licenciatura en Física</option></select></label><button className="button-primary" disabled={guardando}>{guardando ? "Guardando…" : "Registrar monitor"}</button></form></section>
      <section className={estilos.tarjeta}><header><div><h2>Directorio</h2><p>Los resultados se cargan desde la API; una respuesta vacía es válida.</p></div><span className={`${estilos.insignia} ${estilos.neutro}`}>{visibles.length} resultados</span></header><div className={estilos.barraHerramientas}><label className={estilos.campoAncho}><span>Buscar</span><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre, código o correo" /></label><label className={estilos.campo}><span>Estado</span><select value={estado} onChange={(e) => setEstado(e.target.value)}><option value="TODOS">Todos</option><option value="ACTIVOS">Activos</option><option value="INACTIVOS">Inactivos</option></select></label></div><div className={estilos.tablaContenedor}><table className={estilos.tabla}><thead><tr><th>Monitor</th><th>Código</th><th>Correo</th><th>Dependencia</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{cargando ? <tr><td colSpan={6} className={estilos.vacio}>Cargando monitores…</td></tr> : visibles.map((item) => <tr key={item.id}><td><strong>{item.full_name}</strong></td><td>{item.codigo_estudiante}</td><td>{item.user_email || "Sin correo vinculado"}</td><td>{adaptarMonitor(item).dependencia}</td><td><span className={`${estilos.insignia} ${item.is_active ? estilos.exito : estilos.neutro}`}>{item.is_active ? "Activo" : "Inactivo"}</span></td><td><button type="button" className={estilos.botonSecundario} onClick={() => void alternar(item)}>{item.is_active ? "Desactivar" : "Activar"}</button></td></tr>)}{!cargando && !visibles.length && <tr><td colSpan={6} className={estilos.vacio}>No hay monitores registrados o coincidentes.</td></tr>}</tbody></table></div></section></div>
  </div>;
}
