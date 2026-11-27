import type { DetalleVerificacion } from "../types";
import { etiquetasCampo } from "./ComparacionDocumental";
import styles from "./VerificadorDocumentalView.module.css";

export const camposDocumentales: Record<string, string> = {
  fechaCertificado: "Fecha de expedición o consulta del certificado",
  validaHasta: "Vigencia impresa",
  resultadoConsulta: "Resultado textual de la consulta",
  codigoFormato: "Código del formato",
  declaracion: "Texto de declaración",
  fechaDeclaracion: "Fecha de diligenciamiento",
  lugarDeclaracion: "Lugar de diligenciamiento",
  firmaDeclaracion: "Firma de la declaración",
  camposFormato: "Campos sin diligenciar",
  periodoSalud: "Período de salud",
  periodoPension: "Período de pensión",
  periodoCotizacion: "Período de cotización",
  fechaPago: "Fecha de pago",
  numeroPlanilla: "Número de planilla",
  totalPlanilla: "Importe de la planilla",
};
const estados = {
  OK: "Comprobado",
  INCONSISTENCIA: "Inconsistencia",
  NO_VERIFICABLE: "Revisión manual",
};

export function ValidacionDocumental({
  detalle,
  nombres,
}: {
  detalle: DetalleVerificacion;
  nombres: Record<string, string>;
}) {
  const validacion = detalle.resultadoComparacion?.validacionDocumental;
  if (!validacion) return null;
  return (
    <section
      aria-label="Validaciones particulares por documento"
      className={styles.results}
    >
      <h3>Validaciones particulares</h3>
      <div className={styles.classificationSummary}>
        <strong>
          {validacion.resumen.comprobadas} comprobación(es) satisfactorias
        </strong>
        <span>{validacion.resumen.inconsistencias} inconsistencia(s)</span>
        <span>
          {validacion.resumen.noVerificables} comprobación(es) pendientes de
          revisión manual
        </span>
      </div>
      <p>Fecha de solicitud: {validacion.fechaSolicitud || "No disponible"}.</p>
      {validacion.documentos.map((doc) => (
        <details key={doc.documentoIndice}>
          <summary>
            {nombres[doc.tipo] ?? doc.tipo} ·{" "}
            {doc.comprobaciones.filter((c) => c.estado !== "OK").length}{" "}
            observación(es)
          </summary>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <caption>
                Reglas y evidencias de {nombres[doc.tipo] ?? doc.tipo}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Campo</th>
                  <th scope="col">Resultado</th>
                  <th scope="col">Valor original y página</th>
                  <th scope="col">Criterio</th>
                </tr>
              </thead>
              <tbody>
                {doc.comprobaciones.map((c, index) => (
                  <tr key={`${c.campo}-${index}`}>
                    <th scope="row">
                      {camposDocumentales[c.campo] ??
                        etiquetasCampo[c.campo] ??
                        c.campo}
                    </th>
                    <td>{estados[c.estado]}</td>
                    <td>
                      {c.valores.length
                        ? c.valores.map((v, i) => (
                            <p key={i} className={styles.originalValue}>
                              {v.original}
                              <small className={styles.muted}>
                                {" "}
                                · página {v.pagina}
                                {v.normalizado
                                  ? ` · normalizado: ${v.normalizado}`
                                  : ""}
                              </small>
                            </p>
                          ))
                        : "Sin evidencia textual suficiente"}
                    </td>
                    <td>
                      {c.observacion}
                      {c.esperado && <p>Valor de comprobación: {c.esperado}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
      <p className={styles.muted}>
        Las comprobaciones textuales no acreditan autenticidad, pago efectivo ni
        habilitación jurídica. Las firmas y los datos no verificables requieren
        revisión humana. Solo se comprueba la vigencia expresamente impresa; no
        se presuponen plazos de vencimiento.
      </p>
    </section>
  );
}
