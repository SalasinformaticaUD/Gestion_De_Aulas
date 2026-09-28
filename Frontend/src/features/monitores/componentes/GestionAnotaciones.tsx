"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import {
  adaptarAnotacion,
  adaptarMonitor,
  nombreDependencia,
} from "@/features/monitores/api/adaptadoresMonitores";
import type {
  AnotacionApi,
  MonitorApi,
} from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import type { AnotacionMonitor } from "@/features/monitores/tipos/modelosMonitores";
import { Paginacion } from "./Paginacion";
import estilos from "./SistemaVisualMonitores.module.css";
import { SelectorDependenciaAdmin, useFiltroDependenciaAdmin } from "./FiltroDependenciaAdmin";

const vacio = {
  monitorId: "",
  fecha: new Date().toISOString().slice(0, 10),
  tipo: "HORAS_VIRTUALES" as AnotacionMonitor["tipo"],
  accion: "SUMAR" as AnotacionMonitor["accion"],
  horas: 1,
  motivo: "",
};
const tiposApi: Record<
  AnotacionMonitor["tipo"],
  AnotacionApi["annotation_type"]
> = {
  OLVIDO_REGISTRO: "missing_punch",
  HORAS_VIRTUALES: "virtual_hours",
  PERMISO: "permission",
  NOVEDAD: "novelty",
};
const accionesApi: Record<AnotacionMonitor["accion"], AnotacionApi["action"]> =
  { SUMAR: "add", DESCONTAR: "deduct", ANOTAR: "note" };

export function GestionAnotaciones() {
  const esMonitor = (obtenerSesion()?.usuario.roles ?? []).some(
    (rol) => rol.trim().toLowerCase() === "monitor",
  );
  const puedeGestionar = !esMonitor;
  const { esAdministrador, dependencia, setDependencia } = useFiltroDependenciaAdmin();
  const recurso = usarRecursoApi(
    servicioMonitores.listarAnotaciones,
    [] as AnotacionApi[],
  );
  const cargarMonitores = useCallback(
    () => puedeGestionar ? servicioMonitores.listarMonitores() : Promise.resolve([] as MonitorApi[]),
    [puedeGestionar],
  );
  const recursoMonitores = usarRecursoApi(cargarMonitores, [] as MonitorApi[]);
  const [modalFormulario, setModalFormulario] = useState(false);
  const [edicion, setEdicion] = useState<string | null>(null);
  const [formulario, setFormulario] = useState(vacio);
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("TODOS");
  const [accionFiltro, setAccionFiltro] = useState("TODAS");
  const monitores = useMemo(
    () => recursoMonitores.datos.map(adaptarMonitor),
    [recursoMonitores.datos],
  );
  const anotaciones = useMemo(
    () => recurso.datos.map(adaptarAnotacion),
    [recurso.datos],
  );
  const filtradas = useMemo(
    () =>
      [...anotaciones]
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .filter((item) => {
          const monitor = monitores.find(
            (candidato) => candidato.id === item.monitorId,
          );
          const termino = buscar.trim().toLocaleLowerCase("es");
          return (
            (!termino ||
              `${monitor?.nombre ?? ""} ${monitor?.codigo ?? ""}`
                .toLocaleLowerCase("es")
                .includes(termino)) &&
            (tipoFiltro === "TODOS" || item.tipo === tipoFiltro) &&
            (accionFiltro === "TODAS" || item.accion === accionFiltro) &&
            (!puedeGestionar || !dependencia || monitor?.dependencia === nombreDependencia(dependencia))
          );
        }),
    [accionFiltro, anotaciones, buscar, monitores, tipoFiltro, dependencia],
  );
  const paginacion = usarPaginacion(filtradas, 8);
  const cerrarFormulario = () => {
    setModalFormulario(false);
    setEdicion(null);
    setFormulario(vacio);
  };
  const abrirNueva = () => {
    setAviso("");
    setEdicion(null);
    setFormulario(vacio);
    setModalFormulario(true);
  };
  const editar = (item: AnotacionMonitor) => {
    setAviso("");
    setEdicion(item.id);
    setFormulario({
      monitorId: item.monitorId,
      fecha: item.fecha,
      tipo: item.tipo,
      accion: item.accion,
      horas: item.horas,
      motivo: item.motivo,
    });
    setModalFormulario(true);
  };
  const actualizarFiltro = (actualizar: () => void) => {
    actualizar();
    paginacion.reiniciar();
  };
  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!formulario.motivo.trim() || !formulario.monitorId) return;
    setGuardando(true);
    setAviso("");
    const minutos =
      Math.round(formulario.horas * 60) *
      (formulario.accion === "DESCONTAR"
        ? -1
        : formulario.accion === "ANOTAR"
          ? 0
          : 1);
    const payload = {
      monitor: formulario.monitorId,
      session: null,
      annotation_type: tiposApi[formulario.tipo],
      description: formulario.motivo.trim(),
      action: accionesApi[formulario.accion],
      delta_minutes: minutos,
      occurred_on: formulario.fecha,
    };
    try {
      const guardada = edicion
        ? await servicioMonitores.actualizarAnotacion(edicion, payload)
        : await servicioMonitores.crearAnotacion(payload);
      recurso.setDatos((actual) =>
        edicion
          ? actual.map((item) => (item.id === edicion ? guardada : item))
          : [guardada, ...actual],
      );
      setAviso(
        edicion
          ? "Anotación actualizada correctamente."
          : "Anotación registrada correctamente.",
      );
      cerrarFormulario();
      paginacion.reiniciar();
    } catch (problema) {
      setAviso(
        problema instanceof Error
          ? problema.message
          : "No fue posible guardar la anotación.",
      );
    } finally {
      setGuardando(false);
    }
  };
  const eliminar = async (id: string) => {
    setAviso("");
    try {
      await servicioMonitores.eliminarAnotacion(id);
      recurso.setDatos((actual) => actual.filter((item) => item.id !== id));
      setAviso("Anotación eliminada correctamente.");
    } catch (problema) {
      setAviso(
        problema instanceof Error
          ? problema.message
          : "No fue posible eliminar la anotación.",
      );
    }
  };
  const etiquetaAccion = (accion: AnotacionMonitor["accion"]) =>
    accion === "SUMAR"
      ? estilos.exito
      : accion === "DESCONTAR"
        ? estilos.peligro
        : estilos.neutro;
  const nombreMonitor = (id: string) =>
    monitores.find((monitor) => monitor.id === id);

  return (
    <>
      <section className={`page-heading ${estilos.encabezado}`}>
        <div>
          <span className={estilos.etiqueta}>
            {puedeGestionar ? "Ajustes manuales" : "Mi seguimiento"}
          </span>
          <h1>Anotaciones y ajustes</h1>
          <p>
            {puedeGestionar
              ? "Sume o descuente horas por novedades, permisos o correcciones administrativas."
              : "Consulte los ajustes y novedades registrados en su monitoría."}
          </p>
        </div>
        <div className={estilos.encabezadoAcciones}>
          <span className={`${estilos.insignia} ${estilos.informacion}`}>
            {anotaciones.length} registros
          </span>
          {puedeGestionar && (
            <button
              className="button-primary"
              type="button"
              onClick={abrirNueva}
            >
              + Nueva anotación
            </button>
          )}
        </div>
      </section>
      {puedeGestionar && (
        <div className={estilos.aviso}>
          Los cambios afectan los totales mostrados en reportes, dashboard y
          consulta pública.
        </div>
      )}
      {(recurso.error || recursoMonitores.error) && (
        <div className={`${estilos.aviso} ${estilos.avisoError}`}>
          {recurso.error || recursoMonitores.error}
        </div>
      )}
      {aviso && (
        <div
          className={`${estilos.aviso} ${aviso.includes("correctamente") ? estilos.avisoExito : estilos.avisoError}`}
          role="status"
        >
          {aviso}
        </div>
      )}
      <section className={estilos.tarjeta}>
        <header>
          <div>
            <h2>
              {esMonitor ? "Mis anotaciones" : "Historial de anotaciones"}
            </h2>
            <p>{filtradas.length} anotación(es) con los filtros actuales.</p>
          </div>
        </header>
        <div className={`${estilos.barraHerramientas} ${estilos.filtrosAnotaciones}`}>
          {puedeGestionar && (
            <label className={estilos.campoAncho}>
              <span>Buscar monitor</span>
              <input
                value={buscar}
                onChange={(e) =>
                  actualizarFiltro(() => setBuscar(e.target.value))
                }
                placeholder="Nombre o código"
              />
            </label>
          )}
          <SelectorDependenciaAdmin visible={esAdministrador} value={dependencia} onChange={(value) => actualizarFiltro(() => setDependencia(value))} />
          <label className={`${estilos.campo} ${estilos.filtroTipoAnotacion}`}>
            <span>Tipo</span>
            <select
              value={tipoFiltro}
              onChange={(e) =>
                actualizarFiltro(() => setTipoFiltro(e.target.value))
              }
            >
              <option value="TODOS">Todos</option>
              <option value="OLVIDO_REGISTRO">Olvido de registro</option>
              <option value="HORAS_VIRTUALES">Horas virtuales</option>
              <option value="PERMISO">Permiso</option>
              <option value="NOVEDAD">Novedad</option>
            </select>
          </label>
          <label className={`${estilos.campo} ${estilos.filtroAccionAnotacion}`}>
            <span>Acción</span>
            <select
              value={accionFiltro}
              onChange={(e) =>
                actualizarFiltro(() => setAccionFiltro(e.target.value))
              }
            >
              <option value="TODAS">Todas</option>
              <option value="SUMAR">Sumar</option>
              <option value="DESCONTAR">Descontar</option>
            </select>
          </label>
        </div>
        <div className={estilos.tablaContenedor}>
          <table className={`${estilos.tabla} ${puedeGestionar ? estilos.tablaAnotacionesGestion : estilos.tablaAnotacionesPersonal}`}>
            <thead>
              <tr>
                <th>Fecha</th>
                {puedeGestionar && <th>Monitor</th>}
                <th>Tipo</th>
                <th>Acción</th>
                <th>Ajuste</th>
                <th>Registro</th>
                <th>Motivo</th>
                <th>Gestionado por</th>
                {puedeGestionar && <th>Gestión</th>}
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((item) => {
                const monitor = nombreMonitor(item.monitorId);
                return (
                  <tr key={item.id}>
                    <td>{item.fecha}</td>
                    {puedeGestionar && (
                      <td>
                        <strong>
                          {monitor?.nombre ?? "Monitor no disponible"}
                        </strong>
                        <small>{monitor?.codigo}</small>
                      </td>
                    )}
                    <td>{item.tipo.replaceAll("_", " ")}</td>
                    <td>
                      <span
                        className={`${estilos.insignia} ${etiquetaAccion(item.accion)}`}
                      >
                        {item.accion}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {item.accion === "SUMAR"
                          ? "+"
                          : item.accion === "DESCONTAR"
                            ? "−"
                            : ""}
                        {item.horas.toFixed(2)} h
                      </strong>
                    </td>
                    <td>{item.registroId ?? "Sin registro asociado"}</td>
                    <td>{item.motivo}</td>
                    <td>{item.responsable || "No disponible"}</td>
                    {puedeGestionar && (
                      <td>
                        <div className={estilos.accionesTabla}>
                          <button type="button" onClick={() => editar(item)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className={estilos.eliminar}
                            onClick={() => void eliminar(item.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!recurso.cargando && !filtradas.length && (
                <tr>
                  <td
                    colSpan={puedeGestionar ? 9 : 7}
                    className={estilos.vacio}
                  >
                    No hay anotaciones con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginacion {...paginacion} total={filtradas.length} />
      </section>
      {modalFormulario && (
        <div
          className={estilos.fondoModal}
          role="presentation"
          onMouseDown={(evento) =>
            evento.target === evento.currentTarget && cerrarFormulario()
          }
        >
          <section
            className={`${estilos.modal} ${estilos.modalFormularioAnotacion}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario-anotacion"
          >
            <header>
              <div>
                <h2 id="titulo-formulario-anotacion">
                  {edicion ? "Editar anotación" : "Nueva anotación"}
                </h2>
                <p>
                  {edicion
                    ? "Actualice la información de la anotación seleccionada."
                    : "Registre una novedad o ajuste para un monitor activo."}
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarFormulario}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            <form className={estilos.formulario} onSubmit={guardar}>
              <label className={estilos.campo}>
                <span>Monitor</span>
                <select
                  value={formulario.monitorId}
                  onChange={(e) =>
                    setFormulario({ ...formulario, monitorId: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccione</option>
                  {monitores
                    .filter((item) => item.activo)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <label className={estilos.campo}>
                <span>Fecha de la novedad</span>
                <input
                  type="date"
                  value={formulario.fecha}
                  onChange={(e) =>
                    setFormulario({ ...formulario, fecha: e.target.value })
                  }
                  required
                />
              </label>
              <div className={estilos.formularioDoble}>
                <label className={estilos.campo}>
                  <span>Tipo de anotación</span>
                  <select
                    value={formulario.tipo}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        tipo: e.target.value as AnotacionMonitor["tipo"],
                      })
                    }
                  >
                    <option value="OLVIDO_REGISTRO">Olvido de registro</option>
                    <option value="HORAS_VIRTUALES">Horas virtuales</option>
                    <option value="PERMISO">Permiso</option>
                    <option value="NOVEDAD">Novedad</option>
                  </select>
                </label>
                <label className={`${estilos.campo} ${estilos.filtroAccionAnotacion}`}>
                  <span>Acción</span>
                  <select
                    value={formulario.accion}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        accion: e.target.value as AnotacionMonitor["accion"],
                      })
                    }
                  >
                    <option value="SUMAR">Sumar</option>
                    <option value="DESCONTAR">Descontar</option>
                    <option value="ANOTAR">Solo anotar</option>
                  </select>
                </label>
              </div>
              <label className={estilos.campo}>
                <span>Horas a ajustar (h)</span>
                <input
                  type="number"
                  min="0.01"
                  max="24"
                  step="0.01"
                  value={formulario.horas}
                  disabled={formulario.accion === "ANOTAR"}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      horas: Number(e.target.value),
                    })
                  }
                  required={formulario.accion !== "ANOTAR"}
                />
                <small>Ingrese entre 0.01 y 24 horas.</small>
              </label>
              <label className={estilos.campo}>
                <span>Motivo</span>
                <textarea
                  value={formulario.motivo}
                  onChange={(e) =>
                    setFormulario({ ...formulario, motivo: e.target.value })
                  }
                  required
                />
              </label>
              <div className={estilos.accionesModalDecision}>
                <button
                  className={estilos.botonSecundario}
                  type="button"
                  onClick={cerrarFormulario}
                >
                  Cancelar
                </button>
                <button
                  className="button-primary"
                  type="submit"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando…"
                    : edicion
                      ? "Guardar cambios"
                      : "Registrar anotación"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
