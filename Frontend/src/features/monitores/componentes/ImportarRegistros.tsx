"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  adaptarMonitor,
  adaptarResumenDashboard,
} from "@/features/monitores/api/adaptadoresMonitores";
import type {
  ConciliacionApi,
  DashboardApi,
  MonitorApi,
} from "@/features/monitores/api/contratosMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import { usarPaginacion } from "@/features/monitores/ganchos/usarPaginacion";
import { usarRecursoApi } from "@/features/monitores/ganchos/usarRecursoApi";
import { AvisoTemporal } from "./AvisoTemporal";
import { Paginacion } from "./Paginacion";
import { HistorialReciente } from "./panel/HistorialReciente";
import estilos from "./SistemaVisualMonitores.module.css";
import estilosPestanas from "./PestanasActas.module.css";
import { SelectorDependenciaAdmin } from "./FiltroDependenciaAdmin";

type Vista = "ACTUAL" | "RECIENTES" | "HISTORICO";
type FilaHistorica = {
  semester: string;
  department: string;
  monitor_id: string;
  monitor_name: string;
  codigo_estudiante: string;
  normal_hours: number;
  pending_overtime_hours: number;
  approved_overtime_hours: number;
  annotation_hours: number;
  total_hours: number;
  remaining_hours: number;
};
const historialVacio = {
  count: 0,
  next: null,
  previous: null,
  results: [] as ConciliacionApi[],
};

function descargar(nombre: string, filas: string[][]) {
  const contenido = filas
    .map((fila) =>
      fila.map((valor) => `"${valor.replaceAll('"', '""')}"`).join(";"),
    )
    .join("\
");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(
    new Blob([contenido], { type: "text/csv;charset=utf-8;" }),
  );
  enlace.download = `${nombre}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export function ImportarRegistros() {
  const tablero = usarRecursoApi(servicioMonitores.obtenerDashboard, {
    monitor_rows: [],
    pending_overtime: [],
    recent_annotations: [],
    notifications: [],
  } as DashboardApi);
  const recursoMonitores = usarRecursoApi(
    servicioMonitores.listarMonitores,
    [] as MonitorApi[],
  );
  const perfil = usarRecursoApi(servicioMonitores.obtenerPerfilMonitores, {
    role: "leader",
  });
  const [vista, setVista] = useState<Vista>("ACTUAL");
  const [modalCarga, setModalCarga] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{
    procesados: number;
    pendientes: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [paginaReciente, setPaginaReciente] = useState(1);
  const cargarRecientes = useCallback(
    () => servicioMonitores.listarPaginaHistorialAsistencia(paginaReciente),
    [paginaReciente],
  );
  const recientes = usarRecursoApi(cargarRecientes, historialVacio);
  const totalPaginasRecientes = Math.max(
    1,
    Math.ceil(recientes.datos.count / 8),
  );
  const [historicos, setHistoricos] = useState<FilaHistorica[]>([]);
  const [cargandoHistorico, setCargandoHistorico] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [dependencia, setDependencia] = useState("");
  const [dependenciaActual, setDependenciaActual] = useState("");
  const [semestre, setSemestre] = useState("");

  const monitores = useMemo(
    () =>
      recursoMonitores.datos
        .filter((item) => item.is_active && item.semester_is_active === true && (!dependenciaActual || item.department === dependenciaActual))
        .map(adaptarMonitor),
    [recursoMonitores.datos, dependenciaActual],
  );
  const resumenes = useMemo(
    () =>
      adaptarResumenDashboard(tablero.datos.monitor_rows).filter((resumen) =>
        monitores.some((monitor) => monitor.id === resumen.monitorId),
      ),
    [tablero.datos.monitor_rows, monitores],
  );
  const paginacionActual = usarPaginacion(monitores, 10);
  useEffect(() => {
    if (vista !== "HISTORICO" || historicos.length) return;
    let vigente = true;
    setCargandoHistorico(true);
    void servicioMonitores
      .listarHistorico()
      .then((datos) => {
        if (vigente) setHistoricos(datos as FilaHistorica[]);
      })
      .catch((problema) => {
        if (vigente)
          setError(
            problema instanceof Error
              ? problema.message
              : "No fue posible cargar el histórico.",
          );
      })
      .finally(() => {
        if (vigente) setCargandoHistorico(false);
      });
    return () => {
      vigente = false;
    };
  }, [vista, historicos.length]);
  const unicos = useMemo(
    () => [
      ...new Map(
        historicos.map((fila) => [`${fila.monitor_id}-${fila.semester}`, fila]),
      ).values(),
    ],
    [historicos],
  );
  const semestres = useMemo(
    () =>
      [...new Set(unicos.map((fila) => fila.semester))].sort((a, b) =>
        b.localeCompare(a, "es"),
      ),
    [unicos],
  );
  const dependenciasHistoricas = useMemo(
    () =>
      [...new Set(unicos.map((fila) => fila.department))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [unicos],
  );
  const historicosVisibles = useMemo(
    () =>
      unicos.filter((fila) => {
        const texto =
          `${fila.monitor_name} ${fila.codigo_estudiante}`.toLocaleLowerCase(
            "es",
          );
        return (
          (!buscar || texto.includes(buscar.toLocaleLowerCase("es"))) &&
          (!dependencia || fila.department === dependencia) &&
          (!semestre || fila.semester === semestre)
        );
      }),
    [unicos, buscar, dependencia, semestre],
  );
  const paginacionHistorica = usarPaginacion(historicosVisibles, 10);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!archivo) return;
    const extension = archivo.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx")
      return setError("Solo se admiten archivos .xlsx.");
    if (archivo.size > 10 * 1024 * 1024)
      return setError("El archivo no puede superar 10 MB.");
    setError("");
    setCargando(true);
    try {
      const trabajo = await servicioMonitores.importarAsistencia(archivo);
      setResultado({
        procesados: trabajo.imported_rows,
        pendientes: trabajo.failed_rows,
        total: trabajo.total_rows,
      });
      setConfirmacion(
        "Archivo recibido correctamente. El procesamiento continuará en segundo plano.",
      );
      await recientes.recargar();
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No fue posible importar los registros.",
      );
    } finally {
      setCargando(false);
    }
  };
  const exportarActuales = () => {
    descargar("registros_periodo_actual", [
      [
        "Monitor",
        "Normales (h)",
        "Extra aprobadas (h)",
        "Extra pendientes (h)",
        "Anotaciones (h)",
        "Total (h)",
        "Restantes (h)",
      ],
      ...monitores.map((monitor) => {
        const resumen = resumenes.find((item) => item.monitorId === monitor.id);
        const total =
          (resumen?.horasNormales ?? 0) +
          (resumen?.horasExtraAprobadas ?? 0) +
          (resumen?.horasAnotaciones ?? 0);
        return [
          monitor.nombre,
          (resumen?.horasNormales ?? 0).toFixed(1),
          (resumen?.horasExtraAprobadas ?? 0).toFixed(1),
          (resumen?.horasExtraPendientes ?? 0).toFixed(1),
          (resumen?.horasAnotaciones ?? 0).toFixed(1),
          total.toFixed(1),
          Math.max(0, 192 - total).toFixed(1),
        ];
      }),
    ]);
  };
  const exportarRecientes = () =>
    descargar("historial_reciente_registros", [
      ["Nombre crudo", "Dependencia", "Fecha", "Estado", "Monitor"],
      ...recientes.datos.results.map((item) => [
        item.raw_full_name,
        item.raw_department,
        item.work_day,
        item.reconciliation_status,
        item.monitor_name || "Sin monitor",
      ]),
    ]);
  const errorGeneral =
    error || tablero.error || recursoMonitores.error || recientes.error;

  return (
    <div className={estilos.historicosApi}>
      <section className={`page-heading ${estilos.encabezado}`}>
        <div>
          <span className={estilos.etiqueta}>Asistencia y seguimiento</span>
          <h1>Registros</h1>
          <p>
            Consulte los monitores del periodo actual, sus registros y los
            históricos académicos.
          </p>
        </div>
        <div className={estilos.encabezadoAcciones}>
          <small>
            Solo archivos <strong>.xlsx</strong>
          </small>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              setModalCarga(true);
              setError("");
              setConfirmacion("");
            }}
          >
            Cargar registros
          </button>
        </div>
      </section>
      {errorGeneral && (
        <AvisoTemporal
          mensaje={errorGeneral}
          tipo="error"
          alCerrar={() => setError("")}
        />
      )}{" "}
      {confirmacion && !modalCarga && (
        <AvisoTemporal
          mensaje={confirmacion}
          tipo="exito"
          alCerrar={() => setConfirmacion("")}
        />
      )}
      <section className={estilos.tarjeta}>
        <header className={estilosPestanas.cabeceraPestanas}>
          <div
            className={estilosPestanas.pestanas}
            role="tablist"
            aria-label="Vistas de registros"
          >
            <button
              type="button"
              role="tab"
              aria-selected={vista === "ACTUAL"}
              className={
                vista === "ACTUAL" ? estilosPestanas.pestanaActiva : ""
              }
              onClick={() => setVista("ACTUAL")}
            >
              Periodo actual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={vista === "RECIENTES"}
              className={
                vista === "RECIENTES" ? estilosPestanas.pestanaActiva : ""
              }
              onClick={() => setVista("RECIENTES")}
            >
              Historial reciente
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={vista === "HISTORICO"}
              className={
                vista === "HISTORICO" ? estilosPestanas.pestanaActiva : ""
              }
              onClick={() => setVista("HISTORICO")}
            >
              Periodos anteriores
            </button>
          </div>
          <div className={estilosPestanas.indicadorVista}>
            <i />
            {vista === "ACTUAL"
              ? `${monitores.length} monitores activos`
              : vista === "RECIENTES"
                ? "Registros procesados"
                : "Semestres cerrados"}
          </div>
        </header>
      </section>
      {vista === "ACTUAL" && (
        <section className={`${estilos.tarjeta} ${estilos.registrosPrincipal}`}>
          <header>
            <div>
              <h2>Monitores del periodo actual</h2>
              <p>Solo se muestran cuentas activas del semestre vigente.</p>
            </div>
            <SelectorDependenciaAdmin visible={perfil.datos.role === "admin"} value={dependenciaActual} onChange={setDependenciaActual} />
            <button
              type="button"
              className={estilos.botonSecundario}
              onClick={exportarActuales}
            >
              Generar Excel
            </button>
          </header>
          <div className={estilos.tablaContenedor}>
            <table
              className={`${estilos.tabla} ${estilos.tablaRegistrosPrincipal}`}
            >
              <thead>
                <tr>
                  <th>Monitor</th>
                  <th>Dependencia</th>
                  <th>Normales</th>
                  <th>Extra aprobadas</th>
                  <th>Extra pendientes</th>
                  <th>Anotaciones</th>
                  <th>Total</th>
                  <th>Restantes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginacionActual.visibles.map((monitor) => {
                  const resumen = resumenes.find(
                    (item) => item.monitorId === monitor.id,
                  );
                  const total =
                    (resumen?.horasNormales ?? 0) +
                    (resumen?.horasExtraAprobadas ?? 0) +
                    (resumen?.horasAnotaciones ?? 0);
                  return (
                    <tr key={monitor.id}>
                      <td>
                        <strong>{monitor.nombre}</strong>
                        <small>{monitor.codigo}</small>
                      </td>
                      <td>{monitor.dependencia}</td>
                      <td>{(resumen?.horasNormales ?? 0).toFixed(1)} h</td>
                      <td>
                        {(resumen?.horasExtraAprobadas ?? 0).toFixed(1)} h
                      </td>
                      <td>
                        {(resumen?.horasExtraPendientes ?? 0).toFixed(1)} h
                      </td>
                      <td>{(resumen?.horasAnotaciones ?? 0).toFixed(1)} h</td>
                      <td>
                        <strong>{total.toFixed(1)} h</strong>
                      </td>
                      <td>{Math.max(0, 192 - total).toFixed(1)} h</td>
                      <td>
                        <Link
                          className={estilos.accionTablaFija}
                          href={`/gestion-monitores/registros/${encodeURIComponent(monitor.id)}`}
                        >
                          Ver registros
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!monitores.length && (
                  <tr>
                    <td colSpan={9} className={estilos.vacio}>
                      No hay monitores activos en el periodo actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion {...paginacionActual} total={monitores.length} />
        </section>
      )}{" "}
      {vista === "RECIENTES" && (
        <HistorialReciente
          registros={recientes.datos.results}
          cargando={recientes.cargando}
          pagina={paginaReciente}
          totalPaginas={totalPaginasRecientes}
          total={recientes.datos.count}
          onAnterior={() =>
            setPaginaReciente((actual) => Math.max(1, actual - 1))
          }
          onSiguiente={() =>
            setPaginaReciente((actual) =>
              Math.min(totalPaginasRecientes, actual + 1),
            )
          }
          onExportar={exportarRecientes}
        />
      )}{" "}
      {vista === "HISTORICO" && (
        <section className={estilos.tarjeta}>
          <div className={estilos.barraHerramientas}>
            <label className={estilos.campoAncho}>
              <span>Monitor</span>
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Nombre o código"
              />
            </label>
            {perfil.datos.role === "admin" && (
              <label className={estilos.campo}>
                <span>Dependencia</span>
                <select
                  value={dependencia}
                  onChange={(e) => setDependencia(e.target.value)}
                >
                  <option value="">Todas</option>
                  {dependenciasHistoricas.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            )}
            <label className={estilos.campo}>
              <span>Semestre</span>
              <select
                value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
              >
                <option value="">Todos</option>
                {semestres.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <div className={estilos.tablaContenedor}>
            <table className={`${estilos.tabla} ${estilos.tablaHistoricos}`}>
              <thead>
                <tr>
                  <th>Semestre</th>
                  <th>Monitor</th>
                  <th>Dependencia</th>
                  <th>Normales</th>
                  <th>Extra pendiente</th>
                  <th>Extra aprobada</th>
                  <th>Ajustes</th>
                  <th>Total</th>
                  <th>Restantes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginacionHistorica.visibles.map((fila) => (
                  <tr key={`${fila.monitor_id}-${fila.semester}`}>
                    <td>{fila.semester}</td>
                    <td>
                      <strong>{fila.monitor_name}</strong>
                      <small>{fila.codigo_estudiante}</small>
                    </td>
                    <td>{fila.department}</td>
                    <td>{fila.normal_hours} h</td>
                    <td>{fila.pending_overtime_hours} h</td>
                    <td>{fila.approved_overtime_hours} h</td>
                    <td>{fila.annotation_hours} h</td>
                    <td>
                      <strong>{fila.total_hours} h</strong>
                    </td>
                    <td>{fila.remaining_hours} h</td>
                    <td>
                      <Link
                        className={estilos.accionTablaFija}
                        href={`/gestion-monitores/registros/${encodeURIComponent(fila.monitor_id)}`}
                      >
                        Ver registros
                      </Link>
                    </td>
                  </tr>
                ))}
                {cargandoHistorico && (
                  <tr>
                    <td colSpan={10} className={estilos.vacio}>
                      Cargando registros…
                    </td>
                  </tr>
                )}
                {!cargandoHistorico && !historicosVisibles.length && (
                  <tr>
                    <td colSpan={10} className={estilos.vacio}>
                      No hay registros para la selección actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion
            {...paginacionHistorica}
            total={historicosVisibles.length}
          />
        </section>
      )}
      {modalCarga && (
        <div
          className={estilos.fondoModal}
          role="presentation"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setModalCarga(false)
          }
        >
          <section
            className={estilos.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-carga-registros"
          >
            <header>
              <div>
                <span className={estilos.etiqueta}>Carga Excel</span>
                <h2 id="titulo-carga-registros">Cargar registros</h2>
                <p>Seleccione un archivo .xlsx de máximo 10 MB.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalCarga(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            <form className={estilos.formulario} onSubmit={enviar}>
              <label className={estilos.zonaCarga}>
                <span>
                  <strong>
                    {archivo?.name ?? "Seleccione el archivo .xlsx"}
                  </strong>
                  Único formato admitido: .xlsx
                </span>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    setArchivo(e.target.files?.[0] ?? null);
                    setResultado(null);
                  }}
                  required
                />
              </label>
              {confirmacion && (
                <AvisoTemporal
                  mensaje={confirmacion}
                  tipo="exito"
                  alCerrar={() => setConfirmacion("")}
                />
              )}{" "}
              {resultado && (
                <div className={estilos.resultadoImportacion}>
                  <span>
                    <b>{resultado.procesados}</b>Importados
                  </span>
                  <span>
                    <b>{resultado.pendientes}</b>Con error
                  </span>
                  <span>
                    <b>{resultado.total}</b>Total
                  </span>
                </div>
              )}
              <div className={estilos.accionesFormulario}>
                <button
                  type="button"
                  className={estilos.botonSecundario}
                  onClick={() => setModalCarga(false)}
                >
                  Cerrar
                </button>
                <button
                  className="button-primary"
                  type="submit"
                  disabled={!archivo || cargando}
                >
                  {cargando ? "Procesando…" : "Subir registros"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
