import { ComparacionDocumental } from "./ComparacionDocumental";
import { ValidacionDocumental } from "./ValidacionDocumental";
import { HallazgosDocumentales } from "./HallazgosDocumentales";
import {
  estadoResultado,
  etiquetasResultado,
  documentosRequeridos,
} from "../utils/resultadoDocumental";
import type { DetalleVerificacion } from "../types";
import { formatoTamano } from "../utils/validarArchivo";
import styles from "./VerificadorDocumentalView.module.css";

const nombres: Record<string, string> = {
  PERSONERIA: "Antecedentes de Personería",
  PROCURADURIA: "Antecedentes de Procuraduría",
  CONTRALORIA: "Antecedentes de Contraloría",
  POLICIA_JUDICIAL: "Antecedentes de Policía Judicial",
  MEDIDAS_CORRECTIVAS: "Registro de medidas correctivas",
  DELITOS_SEXUALES: "Inhabilidades por delitos sexuales",
  REDAM: "REDAM",
  DECLARACION_VERACIDAD: "Declaración de veracidad GC-PR-002-FR-038",
  SEGURIDAD_SOCIAL: "Planilla de seguridad social",
  NO_RECONOCIDO: "Sin clasificar",
};
const estados: Record<string, string> = {
  IDENTIFICADO: "Identificado",
  NO_ESPERADO: "Página no esperada",
  INCIERTO: "Revisión manual",
  SIN_TEXTO: "Requiere OCR",
  ERROR_EXTRACCION: "Extracción incompleta",
  PENDIENTE: "Pendiente",
};

export function ResultadoDocumental({
  detalle,
}: {
  detalle: DetalleVerificacion;
}) {
  const comparado = !!detalle.versionComparacion;
  const resultado = estadoResultado(detalle);
  const clasificado = !!detalle.versionClasificacion;
  const documentos = detalle.archivos.flatMap((archivo) =>
    archivo.documentos.map((doc) => ({
      ...doc,
      archivo: archivo.nombreOriginal,
    })),
  );
  const tiposEncontrados = new Set(
    documentos
      .filter((d) => Object.hasOwn(documentosRequeridos, d.tipo))
      .map((d) => d.tipo),
  );
  const estructurales = detalle.hallazgos.filter((h) =>
    [
      "DOCUMENTO_FALTANTE",
      "DOCUMENTO_DUPLICADO",
      "POSIBLE_DOCUMENTO_DUPLICADO",
      "DOCUMENTO_FUERA_DE_ORDEN",
      "PAGINA_SIN_TEXTO",
      "EXTRACCION_INCOMPLETA",
      "CLASIFICACION_INCIERTA",
      "PAGINA_NO_ESPERADA",
      "LIMITES_DOCUMENTO_INCIERTOS",
    ].includes(h.codigo),
  );
  const pendiente = detalle.hallazgos.some(
    (h) => h.codigo === "REVISION_DOCUMENTAL_PENDIENTE",
  );
  return (
    <section
      className={styles.results}
      aria-label="Resultado de la carga documental"
    >
      <div
        className={`${styles.resultHeader} ${resultado === "SATISFACTORIA" ? styles.resultSuccess : resultado === "CON_INCONSISTENCIAS" ? styles.resultError : styles.resultIncomplete}`}
        role="status"
        aria-live="polite"
      >
        <span aria-hidden="true">
          {resultado === "SATISFACTORIA"
            ? "✓"
            : resultado === "CON_INCONSISTENCIAS"
              ? "!"
              : "ⓘ"}
        </span>
        <div>
          <h2>{etiquetasResultado[resultado]}</h2>
          <p>
            {resultado === "SATISFACTORIA"
              ? "Los ocho documentos están presentes y las comprobaciones realizadas no tienen observaciones pendientes."
              : resultado === "CON_INCONSISTENCIAS"
                ? "Revise los documentos señalados y confirme los datos originales antes de corregirlos. Las comprobaciones pendientes también requieren atención."
                : detalle.estado === "BORRADOR"
                  ? "Adjunte los PDF para iniciar la revisión."
                  : "Hay documentos o datos que no se pudieron comprobar. Complete la documentación o realice la revisión manual indicada."}
          </p>
        </div>
      </div>
      <div
        className={styles.classificationSummary}
        aria-label="Resumen del resultado"
      >
        <strong>
          {tiposEncontrados.size} de {Object.keys(documentosRequeridos).length}{" "}
          tipos documentales identificados
        </strong>
        <span>{detalle.hallazgos.length} observación(es) por atender</span>
      </div>
      {resultado !== "SATISFACTORIA" &&
        !detalle.hallazgos.length &&
        detalle.estado !== "BORRADOR" && (
          <p className={styles.notice}>
            Este registro no reúne todas las evidencias necesarias para
            confirmar una verificación correcta. Consulte los documentos y las
            comprobaciones disponibles. Si corresponde a una revisión anterior,
            cree una nueva verificación para aplicar las reglas actuales.
          </p>
        )}
      <HallazgosDocumentales detalle={detalle} />
      <p className={styles.muted}>
        Las coincidencias y comprobaciones textuales no acreditan la
        autenticidad de los documentos. Los valores predominantes deben
        confirmarse antes de corregirlos.
      </p>
      <details className={styles.evidenceDetails}>
        <summary>Consultar documentos y evidencias de la revisión</summary>
        <div className={styles.results}>
          {clasificado && (
            <>
              <div
                className={styles.classificationSummary}
                aria-label="Resumen de clasificación"
              >
                <strong>
                  {tiposEncontrados.size} de{" "}
                  {Object.keys(documentosRequeridos).length} tipos identificados
                </strong>
                <span>
                  {estructurales.length
                    ? `${estructurales.length} observación(es) de clasificación y organización`
                    : "Sin hallazgos de clasificación u organización"}
                </span>
                <span>Puede presentar los documentos en cualquier orden.</span>
              </div>
              <details>
                <summary>Documentos requeridos</summary>
                <ul>
                  {Object.entries(documentosRequeridos)
                    .filter(([key]) => key !== "NO_RECONOCIDO")
                    .map(([key, nombre]) => (
                      <li key={key}>
                        {nombre}:{" "}
                        {tiposEncontrados.has(key)
                          ? "identificado"
                          : "no identificado con certeza"}
                      </li>
                    ))}
                </ul>
              </details>
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <caption>Documentos y rangos de páginas</caption>
                  <thead>
                    <tr>
                      <th scope="col">Documento</th>
                      <th scope="col">Archivo</th>
                      <th scope="col">Páginas</th>
                      <th scope="col">Clasificación</th>
                      <th scope="col">Criterio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.map((doc) => (
                      <tr key={doc.id}>
                        <td>{nombres[doc.tipo] ?? doc.tipo}</td>
                        <td>{doc.archivo}</td>
                        <td>
                          {doc.paginaInicio === doc.paginaFin
                            ? doc.paginaInicio
                            : `${doc.paginaInicio}–${doc.paginaFin}`}
                        </td>
                        <td>
                          {estados[doc.estadoClasificacion] ??
                            doc.estadoClasificacion}
                          {doc.requiereRevisionManual &&
                            doc.estadoClasificacion === "IDENTIFICADO" && (
                              <small className={styles.muted}>
                                {" "}
                                · revisar páginas
                              </small>
                            )}
                        </td>
                        <td>
                          {doc.estadoClasificacion === "IDENTIFICADO"
                            ? doc.evidenciasClasificacion?.porContexto
                              ? "Encabezado, paginación y contexto"
                              : "Encabezado y palabras clave"
                            : doc.evidenciasClasificacion?.candidatos?.length
                              ? `Señales de: ${doc.evidenciasClasificacion.candidatos.map((c) => nombres[c] ?? c).join(", ")}`
                              : "Sin evidencia textual suficiente"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <ComparacionDocumental detalle={detalle} />
          <ValidacionDocumental detalle={detalle} nombres={nombres} />
          {!!detalle.archivos.length && (
            <details open={!clasificado}>
              <summary>Archivos recibidos ({detalle.archivos.length})</summary>
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Archivo</th>
                      <th scope="col">Tamaño</th>
                      <th scope="col">Páginas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.archivos.map((archivo) => (
                      <tr key={archivo.id}>
                        <td>{archivo.nombreOriginal}</td>
                        <td>{formatoTamano(archivo.tamanoBytes)}</td>
                        <td>{archivo.numeroPaginas ?? "Sin determinar"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {pendiente && (
            <p className={styles.muted}>
              {comparado
                ? "Las coincidencias no acreditan autenticidad ni sustituyen la revisión de empates, datos insuficientes y validaciones adicionales pendientes."
                : clasificado
                  ? "La clasificación no verifica la identidad, las fechas personales ni el período de seguridad social, y no acredita la autenticidad de los documentos."
                  : "Este registro aún no dispone de clasificación automática."}{" "}
              No es una aprobación documental.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
