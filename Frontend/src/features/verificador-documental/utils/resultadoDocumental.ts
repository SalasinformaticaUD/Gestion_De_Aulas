import type { DetalleVerificacion, Verificacion } from "../types";

export const documentosRequeridos: Record<string, string> = {
  PERSONERIA: "Antecedentes de Personería",
  PROCURADURIA: "Antecedentes de Procuraduría",
  CONTRALORIA: "Antecedentes de Contraloría",
  POLICIA_JUDICIAL: "Antecedentes de Policía Judicial",
  MEDIDAS_CORRECTIVAS: "Registro de medidas correctivas",
  DELITOS_SEXUALES: "Inhabilidades por delitos sexuales",
  REDAM: "REDAM",
  DECLARACION_VERACIDAD: "Declaración GC-PR-002-FR-038",
};

const diferencias = new Set([
  "DIFERENCIA_NUMERICA",
  "DIFERENCIA_IDENTIFICACION",
  "DIFERENCIA_TIPO_IDENTIFICACION",
  "DIFERENCIA_FECHA",
  "DIFERENCIA_ORTOGRAFICA",
  "VALOR_PERSONAL_DIFERENTE",
  "CONFLICTO_INTERNO_CAMPO",
  "DOCUMENTO_FUERA_DE_ORDEN",
  "DOCUMENTO_DUPLICADO",
]);
export function estadoResultado(
  detalle: DetalleVerificacion,
): "SATISFACTORIA" | "CON_INCONSISTENCIAS" | "INCOMPLETA" {
  const comparacion = detalle.resultadoComparacion;
  const validacion = comparacion?.validacionDocumental;
  if (
    detalle.estado === "CON_INCONSISTENCIAS" ||
    comparacion?.resumen.camposConDiferencias ||
    validacion?.resumen.inconsistencias ||
    detalle.hallazgos.some((h) => diferencias.has(h.codigo)) ||
    validacion?.documentos.some((d) =>
      d.comprobaciones.some((c) => c.estado === "INCONSISTENCIA"),
    )
  )
    return "CON_INCONSISTENCIAS";
  const documentos = detalle.archivos.flatMap((a) => a.documentos);
  const completo = Object.keys(documentosRequeridos).every(
    (tipo) =>
      documentos.filter((d) => d.tipo === tipo).length === 1 &&
      validacion?.documentos.filter((d) => d.tipo === tipo).length === 1,
  );
  const identidad = [
    "nombreCompleto",
    "numeroIdentificacion",
    "tipoIdentificacion",
  ].every((campo) =>
    comparacion?.campos.some(
      (c) =>
        c.campo === campo &&
        c.estado.startsWith("COINCIDENCIA") &&
        c.fuentesIndependientes >= 2,
    ),
  );
  const pendiente =
    !detalle.versionClasificacion ||
    !detalle.versionComparacion ||
    !validacion ||
    detalle.hallazgos.length > 0 ||
    validacion.resumen.noVerificables > 0 ||
    documentos.some(
      (d) =>
        d.estadoClasificacion !== "IDENTIFICADO" ||
        d.requiereOcr ||
        d.requiereRevisionManual,
    ) ||
    validacion.documentos.some(
      (d) =>
        !d.comprobaciones.length ||
        d.comprobaciones.some((c) => c.estado !== "OK"),
    ) ||
    comparacion?.campos.some(
      (c) => c.noInterpretables.length > 0 || c.tiposEnConflicto.length > 0,
    );
  // Nunca elevar un estado del servidor ni confiar solo en "SATISFACTORIA"
  // para registros históricos sin todas las evidencias de revisión.
  return detalle.estado === "SATISFACTORIA" &&
    completo &&
    identidad &&
    !pendiente
    ? "SATISFACTORIA"
    : "INCOMPLETA";
}

export const etiquetasResultado = {
  SATISFACTORIA: "Documentación verificada correctamente",
  CON_INCONSISTENCIAS: "Documentación con inconsistencias",
  INCOMPLETA: "Verificación incompleta",
};

export function estadoHistorial(item: Verificacion) {
  if (item.estado !== "SATISFACTORIA") return item.estado;
  const validacion = item.resultadoComparacion?.validacionDocumental;
  const completo =
    validacion &&
    Object.keys(documentosRequeridos).every(
      (tipo) =>
        validacion.documentos.filter((d) => d.tipo === tipo).length === 1,
    );
  const identidad = [
    "nombreCompleto",
    "numeroIdentificacion",
    "tipoIdentificacion",
  ].every((campo) =>
    item.resultadoComparacion?.campos.some(
      (c) =>
        c.campo === campo &&
        c.estado.startsWith("COINCIDENCIA") &&
        c.fuentesIndependientes >= 2,
    ),
  );
  return item.versionClasificacion &&
    item.versionComparacion &&
    completo &&
    identidad &&
    item._count?.archivos &&
    item._count.hallazgos === 0 &&
    item.resultadoComparacion?.resumen.camposConDiferencias === 0 &&
    validacion.resumen.inconsistencias === 0 &&
    validacion.resumen.noVerificables === 0 &&
    validacion.documentos.every(
      (d) =>
        d.comprobaciones.length &&
        d.comprobaciones.every((c) => c.estado === "OK"),
    ) &&
    item.resultadoComparacion.campos.every(
      (c) => !c.noInterpretables.length && !c.tiposEnConflicto.length,
    )
    ? "SATISFACTORIA"
    : "INCOMPLETA";
}

type Hallazgo = DetalleVerificacion["hallazgos"][number];
const personales = new Set([
  "nombreCompleto",
  "primerNombre",
  "segundoNombre",
  "primerApellido",
  "segundoApellido",
  "numeroIdentificacion",
  "tipoIdentificacion",
  "fechaNacimiento",
  "lugarExpedicion",
  "fechaExpedicion",
  "lugarNacimiento",
  "nacionalidad",
  "sexo",
  "correo",
  "telefono",
]);
export function coincidenciaHallazgo(
  detalle: DetalleVerificacion,
  hallazgo: Hallazgo,
) {
  if (!personales.has(hallazgo.campo))
    return { valor: "No aplica a esta comprobación.", detalle: "" };
  const campo = detalle.resultadoComparacion?.campos.find(
    (c) => c.campo === hallazgo.campo,
  );
  if (hallazgo.codigo === "EMPATE_EN_CAMPO" || campo?.estado === "EMPATE")
    return {
      valor: "Sin valor predominante: hay un empate.",
      detalle: "Se requiere revisión manual.",
    };
  if (
    !campo?.mayoritario?.esMayoriaAbsoluta ||
    campo.mayoritario.votos < 2 ||
    campo.fuentesIndependientes < 2 ||
    campo.mayoritario.votos <= campo.fuentesIndependientes / 2
  )
    return {
      valor: "No se estableció un valor con evidencia suficiente.",
      detalle:
        "Se requiere revisión manual; no elegir un valor automáticamente.",
    };
  const grupo = campo.grupos.find((g) => g.valor === campo.mayoritario?.valor);
  return {
    valor: grupo?.observaciones[0]?.original ?? campo.mayoritario.valor,
    detalle: `${campo.mayoritario.votos} de ${campo.fuentesIndependientes} tipos documentales comparables. Confirmar antes de corregir.`,
  };
}
