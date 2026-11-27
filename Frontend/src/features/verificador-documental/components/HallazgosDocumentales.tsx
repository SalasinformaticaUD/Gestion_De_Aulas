import type { DetalleVerificacion } from "../types";
import {
  coincidenciaHallazgo,
  documentosRequeridos,
} from "../utils/resultadoDocumental";
import { titulos } from "../utils/etiquetasHallazgos";
import { etiquetasCampo } from "./ComparacionDocumental";
import { camposDocumentales } from "./ValidacionDocumental";
import styles from "./VerificadorDocumentalView.module.css";

type Hallazgo = DetalleVerificacion["hallazgos"][number];
const campos: Record<string, string> = {
  clasificacion: "Tipo documental",
  paginas: "Páginas del documento",
  documentacion: "Documentación",
  orden: "Orden documental",
  ...etiquetasCampo,
  ...camposDocumentales,
};

function accion(hallazgo: Hallazgo, campo: string, nombre: string) {
  if (hallazgo.codigo === "DOCUMENTO_FALTANTE")
    return `Confirmar la presencia de ${nombre} o aportar el documento completo y legible.`;
  if (
    [
      "DIFERENCIA_NUMERICA",
      "DIFERENCIA_IDENTIFICACION",
      "DIFERENCIA_TIPO_IDENTIFICACION",
      "DIFERENCIA_FECHA",
      "DIFERENCIA_ORTOGRAFICA",
      "VALOR_PERSONAL_DIFERENTE",
    ].includes(hallazgo.codigo)
  )
    return `Revisar y corregir el campo «${campo}» en este documento, previa confirmación de los valores originales.`;
  if (hallazgo.codigo === "EMPATE_EN_CAMPO")
    return "Resolver el empate mediante revisión de las fuentes originales. No elegir ni corregir un valor automáticamente.";
  if (hallazgo.codigo === "FIRMA_REQUIERE_REVISION")
    return "Revisar visualmente la firma del formato o efectuar su validación especializada antes de darla por comprobada.";
  if (hallazgo.codigo === "DECLARACION_FECHA_INCOMPLETA")
    return "Completar la fecha de diligenciamiento de la declaración, previa confirmación de la fecha real.";
  if (hallazgo.codigo === "PERIODO_COTIZACION_INCORRECTO")
    return "Revisar el período de cotización y aportar la planilla correspondiente al mes anterior a la solicitud de contratación.";
  return (
    hallazgo.accionSugerida ||
    "Revisar el documento original y confirmar la información antes de continuar."
  );
}

export function HallazgosDocumentales({
  detalle,
}: {
  detalle: DetalleVerificacion;
}) {
  if (!detalle.hallazgos.length) return null;
  const documentos = detalle.archivos.flatMap((a) =>
    a.documentos.map((d) => ({ ...d, archivo: a.nombreOriginal })),
  );
  const grupos = new Map<
    string,
    { nombre: string; archivo?: string; hallazgos: Hallazgo[] }
  >();
  for (const hallazgo of detalle.hallazgos) {
    const doc = documentos.find((d) => d.id === hallazgo.documentoId);
    const tipo =
      doc?.tipo ??
      (hallazgo.codigo === "DOCUMENTO_FALTANTE"
        ? hallazgo.campo
        : "EXPEDIENTE");
    const key = doc?.id ?? tipo;
    const grupo = grupos.get(key) ?? {
      nombre:
        documentosRequeridos[tipo] ??
        (tipo === "NO_RECONOCIDO"
          ? "Página sin clasificar"
          : "Organización y revisión del expediente"),
      archivo: doc?.archivo,
      hallazgos: [],
    };
    grupo.hallazgos.push(hallazgo);
    grupos.set(key, grupo);
  }
  return (
    <section
      className={styles.actionResults}
      aria-label="Correcciones y revisión requerida"
    >
      <h3>Qué debe corregir o revisar</h3>
      {Array.from(grupos.entries()).map(([key, grupo]) => (
        <section
          key={key}
          className={styles.documentFindings}
          aria-label={`Pendientes de ${grupo.nombre}`}
        >
          <header>
            <h3>{grupo.nombre}</h3>
            {grupo.archivo && (
              <small className={styles.muted}>Archivo: {grupo.archivo}</small>
            )}
          </header>
          {grupo.hallazgos.map((h) => {
            const doc = documentos.find((d) => d.id === h.documentoId);
            const campo =
              h.codigo === "DOCUMENTO_FALTANTE"
                ? "Presencia del documento"
                : (campos[h.campo] ?? documentosRequeridos[h.campo] ?? h.campo);
            const coincidencia = coincidenciaHallazgo(detalle, h);
            const paginas = h.evidencia?.paginas?.length
              ? h.evidencia.paginas.join(", ")
              : h.pagina;
            const pagina =
              h.codigo === "DOCUMENTO_FALTANTE"
                ? "No aplica: documento no identificado."
                : paginas
                  ? String(paginas)
                  : doc
                    ? `${doc.paginaInicio}–${doc.paginaFin} (rango del documento)`
                    : "No determinada; revisar el expediente.";
            return (
              <article
                key={h.id}
                className={styles.findingCard}
                aria-labelledby={`hallazgo-${h.id}`}
              >
                <h4 id={`hallazgo-${h.id}`}>
                  {titulos[h.codigo] ?? "Revisión requerida"}
                </h4>
                <dl className={styles.findingData}>
                  <dt>Página</dt>
                  <dd>{pagina}</dd>
                  <dt>Campo</dt>
                  <dd>{campo}</dd>
                  <dt>Valor encontrado</dt>
                  <dd className={styles.originalValue}>
                    {h.valorEncontrado ||
                      (h.codigo === "DOCUMENTO_FALTANTE"
                        ? "Documento no identificado con certeza."
                        : "No disponible en el texto extraído.")}
                  </dd>
                  <dt>Valor con mayor coincidencia</dt>
                  <dd className={styles.originalValue}>
                    {coincidencia.valor}
                    {coincidencia.detalle && (
                      <small className={styles.muted}>
                        {coincidencia.detalle}
                      </small>
                    )}
                  </dd>
                  {h.valorReferencia &&
                    !Object.hasOwn(etiquetasCampo, h.campo) && (
                      <>
                        <dt>
                          {h.codigo === "FECHA_POSTERIOR_SOLICITUD"
                            ? "Fecha límite de referencia"
                            : "Valor esperado por la regla"}
                        </dt>
                        <dd className={styles.originalValue}>
                          {h.valorReferencia}
                        </dd>
                      </>
                    )}
                  <dt>Observación</dt>
                  <dd>{h.observacion}</dd>
                  <dt>Acción requerida</dt>
                  <dd className={styles.requiredAction}>
                    {accion(h, campo, grupo.nombre)}
                  </dd>
                </dl>
              </article>
            );
          })}
        </section>
      ))}
    </section>
  );
}
