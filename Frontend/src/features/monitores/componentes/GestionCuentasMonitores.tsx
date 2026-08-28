"use client";

import { useMemo, useState, type FormEvent } from "react";
import { monitoresDemo } from "@/features/monitores/api/datosDemo";
import estilos from "./SistemaVisualMonitores.module.css";
import { CabeceraCuentas } from "./cuentas/CabeceraCuentas";
import { CargaMasivaCuentas } from "./cuentas/CargaMasivaCuentas";
import { FormularioCuenta } from "./cuentas/FormularioCuenta";
import { ListadoCuentas } from "./cuentas/ListadoCuentas";
import { MetricasCuentas } from "./cuentas/MetricasCuentas";
import type { CuentaMonitor, EstadoCuentaMonitor, FormularioCuentaMonitor } from "./cuentas/tipos";

const datosIniciales: CuentaMonitor[] = monitoresDemo.map((monitor, indice) => ({ id: monitor.id, nombre: monitor.full_name, codigo: monitor.codigo_estudiante, documento: `10${String(214500 + indice)}`, correo: `${monitor.full_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", ".").toLowerCase()}@correo.udistrital.edu.co`, proyecto: indice % 2 ? "Ingeniería de Sistemas" : "Tecnología en Software", telefono: `300 555 01${String(indice).padStart(2, "0")}`, dependencia: monitor.department === "physics" ? "Monitores Física" : monitor.department === "electrical" ? "Monitores Laboratorios" : "Monitores Aulas de Software", repite: indice % 2 === 0, alertas: indice % 3 === 0 ? 1 : 0, estado: indice === 4 ? "PENDIENTE" : indice === 5 ? "INACTIVO" : "ACTIVO" }));
const formularioVacio: FormularioCuentaMonitor = { nombre: "", codigo: "", documento: "", correo: "", proyecto: "", telefono: "", dependencia: "Monitores Física", repite: false };

function descargarExcel(filas: CuentaMonitor[]) { const csv = [["Nombre", "Código", "Correo", "Dependencia", "Alertas", "Estado"], ...filas.map((item) => [item.nombre, item.codigo, item.correo, item.dependencia, String(item.alertas), item.estado])].map((fila) => fila.map((valor) => `"${valor.replaceAll('"', '""')}"`).join(";")).join("\n"); const enlace = document.createElement("a"); enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })); enlace.download = "monitores.csv"; enlace.click(); URL.revokeObjectURL(enlace.href); }

export function GestionCuentasMonitores() {
  const [monitores, setMonitores] = useState(datosIniciales);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [edicion, setEdicion] = useState<string | null>(null);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [alertas, setAlertas] = useState("TODAS");
  const [orden, setOrden] = useState("NOMBRE");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [aviso, setAviso] = useState("");

  const visibles = useMemo(() => monitores.filter((item) => (!buscar || `${item.nombre} ${item.codigo} ${item.correo} ${item.documento}`.toLowerCase().includes(buscar.toLowerCase())) && (estado === "TODOS" || item.estado === estado) && (alertas === "TODAS" || (alertas === "CON_ALERTAS" ? item.alertas > 0 : item.alertas === 0))).sort((a, b) => orden === "CODIGO" ? a.codigo.localeCompare(b.codigo) : orden === "RECIENTE" ? b.id.localeCompare(a.id) : a.nombre.localeCompare(b.nombre, "es")), [monitores, buscar, estado, alertas, orden]);
  const metricas = { total: monitores.length, activos: monitores.filter((item) => item.estado === "ACTIVO").length, pendientes: monitores.filter((item) => item.estado === "PENDIENTE").length, inactivos: monitores.filter((item) => item.estado === "INACTIVO").length };

  const guardar = (evento: FormEvent<HTMLFormElement>) => { evento.preventDefault(); const datos = { ...formulario, nombre: formulario.nombre.trim(), codigo: formulario.codigo.trim(), documento: formulario.documento.trim(), correo: formulario.correo.trim(), telefono: formulario.telefono.trim() }; if (edicion) { setMonitores((actual) => actual.map((item) => item.id === edicion ? { ...item, ...datos } : item)); setAviso("Monitor actualizado correctamente."); } else { setMonitores((actual) => [{ id: `monitor-${Date.now()}`, ...datos, alertas: 0, estado: "PENDIENTE" as EstadoCuentaMonitor }, ...actual]); setAviso("Cuenta creada y enlace de activación enviado en modo demo."); } setFormulario(formularioVacio); setEdicion(null); };
  const editar = (monitor: CuentaMonitor) => { setEdicion(monitor.id); setFormulario({ nombre: monitor.nombre, codigo: monitor.codigo, documento: monitor.documento, correo: monitor.correo, proyecto: monitor.proyecto, telefono: monitor.telefono, dependencia: monitor.dependencia, repite: monitor.repite }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const cancelarEdicion = () => { setEdicion(null); setFormulario(formularioVacio); };

  return <div className={estilos.gestionCuentas}>
    <CabeceraCuentas onExportar={() => descargarExcel(visibles)} />
    <MetricasCuentas {...metricas} />
    {aviso && <div className={`${estilos.aviso} ${estilos.avisoExito}`}>{aviso}</div>}
    <div className={estilos.distribucionFormulario}>
      <aside className={estilos.columnaFormularios}><FormularioCuenta formulario={formulario} editando={Boolean(edicion)} onCambio={setFormulario} onCancelar={cancelarEdicion} onSubmit={guardar} /><CargaMasivaCuentas archivo={archivo} onArchivo={setArchivo} onSubmit={(evento) => { evento.preventDefault(); if (!archivo) return; setAviso(`Archivo ${archivo.name} recibido para carga masiva en modo demo.`); setArchivo(null); }} /></aside>
      <ListadoCuentas monitores={visibles} texto={textoBusqueda} estado={estado} alertas={alertas} orden={orden} onTexto={setTextoBusqueda} onEstado={setEstado} onAlertas={setAlertas} onOrden={setOrden} onBuscar={() => setBuscar(textoBusqueda)} onExportar={() => descargarExcel(visibles)} onEditar={editar} onAlternarEstado={(monitor) => { setMonitores((actual) => actual.map((item) => item.id === monitor.id ? { ...item, estado: item.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO" } : item)); setAviso(`Monitor ${monitor.estado === "ACTIVO" ? "desactivado" : "activado"} correctamente.`); }} onReenviar={(monitor) => setAviso(`Invitación reenviada a ${monitor.correo}.`)} onEliminar={(monitor) => { setMonitores((actual) => actual.filter((item) => item.id !== monitor.id)); setAviso("Monitor eliminado."); }} />
    </div>
  </div>;
}
