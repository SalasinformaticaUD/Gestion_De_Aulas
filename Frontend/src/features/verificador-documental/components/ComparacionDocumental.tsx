import type { DetalleVerificacion } from "../types";
import styles from "./VerificadorDocumentalView.module.css";
export const etiquetasCampo: Record<string, string> = {
  nombreCompleto: "Nombre completo",
  primerNombre: "Primer nombre",
  segundoNombre: "Segundo nombre",
  primerApellido: "Primer apellido",
  segundoApellido: "Segundo apellido",
  numeroIdentificacion: "Número de identificación",
  tipoIdentificacion: "Tipo de identificación",
  fechaNacimiento: "Fecha de nacimiento",
  lugarExpedicion: "Lugar de expedición",
  fechaExpedicion: "Fecha de expedición de la identificación",
  lugarNacimiento: "Lugar de nacimiento",
  nacionalidad: "Nacionalidad",
  sexo: "Sexo",
  correo: "Correo electrónico",
  telefono: "Teléfono",
};
const motivos: Record<string, string> = {
  FORMATO_FECHA_AMBIGUO: "No se puede determinar el orden de día y mes",
  FECHA_INVALIDA: "La fecha no es válida",
  FECHA_NO_INTERPRETABLE: "No se reconoce el formato de fecha",
  ORDEN_NOMBRE_AMBIGUO: "La presentación del nombre admite varios candidatos",
  DATO_VACIO: "Campo sin información verificable",
  IDENTIFICACION_NO_INTERPRETABLE:
    "No se reconoce el formato de identificación",
  TIPO_NO_RECONOCIDO: "Tipo de identificación no reconocido",
  CORREO_NO_INTERPRETABLE: "Correo no interpretable",
  TELEFONO_NO_INTERPRETABLE: "Teléfono no interpretable",
};
const estados: Record<string, string> = {
  SIN_DATOS: "Sin datos disponibles",
  INFORMACION_INSUFICIENTE: "Información insuficiente",
  COINCIDENCIA_EXACTA: "Coincidencia exacta",
  COINCIDENCIA_NORMALIZADA: "Coincidencia después de normalizar",
  DIFERENCIAS: "Valores diferentes",
  EMPATE: "Empate · revisión manual",
  MAYORIA_RELATIVA: "Mayoría relativa · sin referencia suficiente",
  CONFLICTO_INTERNO: "Contradicción dentro del mismo tipo",
};
export function ComparacionDocumental({
  detalle,
}: {
  detalle: DetalleVerificacion;
}) {
  const resultado = detalle.resultadoComparacion;
  if (!resultado) return null;
  const documentos = detalle.archivos.flatMap((a) =>
    a.documentos.map((d) => ({ ...d, archivo: a.nombreOriginal })),
  );
  const conDatos = resultado.campos.filter((c) => c.documentosDisponibles > 0),
    sinDatos = resultado.campos.filter((c) => c.documentosDisponibles === 0);
  const origen = (index: number, pagina: number) =>
    `${documentos[index]?.archivo ?? "Documento"} · página ${pagina}`;
  return (
    <section
      className={styles.results}
      aria-label="Comparación de información personal"
    >
      <h2>Comparación de información personal</h2>
      <div className={styles.classificationSummary}>
        <strong>
          {resultado.resumen.camposCoincidentes} campo(s) coincidente(s)
        </strong>
        <span>
          {resultado.resumen.camposConDiferencias} campo(s) con diferencias o
          contradicciones
        </span>
        <span>{resultado.resumen.camposConEmpate} empate(s)</span>
      </div>
      <p className={styles.muted}>
        Cada tipo documental aporta como máximo un voto por campo. Las copias y
        las páginas repetidas no aumentan su peso. Un valor mayoritario es una
        coincidencia observada y debe confirmarse antes de corregir información.
      </p>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption>Coincidencias y diferencias entre documentos</caption>
          <thead>
            <tr>
              <th scope="col">Campo</th>
              <th scope="col">Resultado</th>
              <th scope="col">Fuentes independientes</th>
              <th scope="col">Valor más coincidente</th>
            </tr>
          </thead>
          <tbody>
            {conDatos.map((c) => (
              <tr key={c.campo}>
                <th scope="row">{etiquetasCampo[c.campo] ?? c.campo}</th>
                <td>
                  {estados[c.estado] ?? c.estado}
                  {c.noInterpretables.length > 0 && (
                    <p className={styles.muted}>
                      {c.noInterpretables.length} dato(s) no interpretable(s)
                    </p>
                  )}
                </td>
                <td>
                  {c.fuentesIndependientes} tipo(s) · {c.documentosDisponibles}{" "}
                  documento(s)
                </td>
                <td>
                  {c.mayoritario ? (
                    <>
                      <span>
                        {c.grupos.find((g) => g.valor === c.mayoritario?.valor)
                          ?.observaciones[0]?.original ?? c.mayoritario.valor}
                      </span>
                      <p className={styles.muted}>
                        {c.mayoritario.votos}/{c.fuentesIndependientes} tipos ·{" "}
                        {c.mayoritario.esMayoriaAbsoluta
                          ? "mayoría absoluta de las fuentes comparables"
                          : "mayoría relativa, sin referencia suficiente"}
                      </p>
                    </>
                  ) : c.estado === "EMPATE" ? (
                    "Ninguno: empate"
                  ) : (
                    "Sin evidencia suficiente"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!conDatos.length && (
        <p>
          No se extrajeron campos personales con suficiente información para
          comparar.
        </p>
      )}
      <details>
        <summary>Ver valores originales y su procedencia</summary>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Campo</th>
                <th scope="col">Valor original</th>
                <th scope="col">Normalizado</th>
                <th scope="col">Documento y página</th>
                <th scope="col">Observación</th>
              </tr>
            </thead>
            <tbody>
              {conDatos.flatMap((c) =>
                [
                  ...c.grupos.flatMap((g) => g.observaciones),
                  ...c.noInterpretables,
                ].map((o, i) => (
                  <tr key={`${c.campo}-${i}`}>
                    <td>{etiquetasCampo[c.campo] ?? c.campo}</td>
                    <td className={styles.originalValue}>{o.original}</td>
                    <td>{o.normalizado ?? "No interpretable"}</td>
                    <td>
                      {origen(o.documentoIndice, o.pagina)}
                      <small className={styles.muted}> · {o.tipo}</small>
                    </td>
                    <td>
                      {(o.motivo
                        ? (motivos[o.motivo] ?? "Requiere revisión manual")
                        : undefined) ??
                        (c.tiposEnConflicto.includes(o.tipo)
                          ? "Fuente excluida del consenso por contradicciones"
                          : "Dato extraído del documento")}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>
      {conDatos.some((c) => c.referenciaIngresada?.coincide === false) && (
        <article className={styles.notice}>
          <strong>Revisar los datos ingresados</strong>
          <p>
            Estos datos no participaron en la votación y difieren de los valores
            extraídos:
          </p>
          <ul>
            {conDatos
              .filter((c) => c.referenciaIngresada?.coincide === false)
              .map((c) => (
                <li key={c.campo}>
                  {etiquetasCampo[c.campo] ?? c.campo}:{" "}
                  {c.referenciaIngresada?.original}
                </li>
              ))}
          </ul>
        </article>
      )}
      {!!sinDatos.length && (
        <details>
          <summary>Campos sin datos disponibles ({sinDatos.length})</summary>
          <ul>
            {sinDatos.map((c) => (
              <li key={c.campo}>
                {etiquetasCampo[c.campo] ?? c.campo}: sin información para
                comparar.
              </li>
            ))}
          </ul>
          <p className={styles.muted}>
            No todos los formatos incluyen estos campos. Su ausencia no
            demuestra una inconsistencia.
          </p>
        </details>
      )}
    </section>
  );
}
