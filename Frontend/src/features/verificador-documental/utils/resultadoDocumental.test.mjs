import test from "node:test";
import assert from "node:assert/strict";
import {
  estadoResultado,
  estadoHistorial,
  coincidenciaHallazgo,
  documentosRequeridos,
} from "./resultadoDocumental.ts";

function completo() {
  const tipos = Object.keys(documentosRequeridos);
  return {
    estado: "SATISFACTORIA",
    versionClasificacion: "reglas-v1",
    versionComparacion: "comparacion-v1",
    _count: { archivos: 1, hallazgos: 0 },
    archivos: [
      {
        documentos: tipos.map((tipo) => ({
          tipo,
          estadoClasificacion: "IDENTIFICADO",
          requiereOcr: false,
          requiereRevisionManual: false,
        })),
      },
    ],
    hallazgos: [],
    resultadoComparacion: {
      resumen: { camposConDiferencias: 0 },
      campos: [
        "nombreCompleto",
        "numeroIdentificacion",
        "tipoIdentificacion",
      ].map((campo) => ({
        campo,
        estado: "COINCIDENCIA_NORMALIZADA",
        fuentesIndependientes: 6,
        noInterpretables: [],
        tiposEnConflicto: [],
        grupos: [
          {
            valor: "1023456789",
            votos: 5,
            observaciones: [{ original: "1023456789" }],
          },
        ],
        mayoritario: { valor: "1023456789", votos: 5, esMayoriaAbsoluta: true },
      })),
      validacionDocumental: {
        resumen: { inconsistencias: 0, noVerificables: 0 },
        documentos: tipos.map((tipo) => ({
          tipo,
          comprobaciones: [{ campo: "identidad", estado: "OK" }],
        })),
      },
    },
  };
}
test("muestra éxito solo con ocho tipos y todas las comprobaciones sin pendientes", () => {
  assert.equal(estadoResultado(completo()), "SATISFACTORIA");
  assert.equal(estadoHistorial(completo()), "SATISFACTORIA");
});
for (const tipo of Object.keys(documentosRequeridos))
  test(`impide éxito si falta ${tipo} aunque el estado almacenado sea satisfactorio`, () => {
    const d = completo();
    d.archivos[0].documentos = d.archivos[0].documentos.filter(
      (v) => v.tipo !== tipo,
    );
    assert.equal(estadoResultado(d), "INCOMPLETA");
  });
for (const codigo of [
  "PAGINA_SIN_TEXTO",
  "EXTRACCION_INCOMPLETA",
  "DOCUMENTO_FALTANTE",
  "EMPATE_EN_CAMPO",
  "DATO_NO_INTERPRETABLE",
  "FIRMA_REQUIERE_REVISION",
  "DESCONOCIDO",
])
  test(`pendiente ${codigo} impide éxito`, () => {
    const d = completo();
    d.hallazgos.push({ codigo });
    d._count.hallazgos = 1;
    assert.equal(estadoResultado(d), "INCOMPLETA");
    assert.equal(estadoHistorial(d), "INCOMPLETA");
  });
test("los datos ilegibles bloquean éxito incluso sin hallazgo", () => {
  const d = completo();
  d.archivos[0].documentos[0].requiereOcr = true;
  assert.equal(estadoResultado(d), "INCOMPLETA");
});
test("un documento duplicado no pasa por tener ocho tipos", () => {
  const d = completo();
  d.archivos[0].documentos.push({ ...d.archivos[0].documentos[0] });
  assert.equal(estadoResultado(d), "INCOMPLETA");
});
test("una regla inconsistente bloquea éxito aunque el contador indique cero", () => {
  const d = completo();
  d.resultadoComparacion.validacionDocumental.documentos[0].comprobaciones[0].estado =
    "INCONSISTENCIA";
  assert.equal(estadoResultado(d), "CON_INCONSISTENCIAS");
  assert.equal(estadoHistorial(d), "INCOMPLETA");
});
test("la falta de evidencias de comparación bloquea éxito histórico", () => {
  const d = completo();
  d.resultadoComparacion = null;
  assert.equal(estadoResultado(d), "INCOMPLETA");
  assert.equal(estadoHistorial(d), "INCOMPLETA");
});
for (const estado of ["BORRADOR", "PROCESANDO", "INCOMPLETA", "FALLIDA"])
  test(`no eleva ${estado} a éxito por tener una lista de hallazgos vacía`, () => {
    const d = completo();
    d.estado = estado;
    assert.equal(estadoResultado(d), "INCOMPLETA");
  });
test("muestra diferencias aunque también falte un documento", () => {
  const d = completo();
  d.archivos[0].documentos.pop();
  d.hallazgos.push({ codigo: "DIFERENCIA_NUMERICA" });
  assert.equal(estadoResultado(d), "CON_INCONSISTENCIAS");
});
test("el caso cinco contra uno muestra el original mayoritario y su apoyo", () => {
  const d = completo();
  const h = {
    campo: "numeroIdentificacion",
    codigo: "DIFERENCIA_NUMERICA",
    valorReferencia: "OTRO",
  };
  const r = coincidenciaHallazgo(d, h);
  assert.equal(r.valor, "1023456789");
  assert.match(r.detalle, /5 de 6/);
});
test("un empate no propone valor aun si existe una referencia histórica", () => {
  const d = completo();
  const r = coincidenciaHallazgo(d, {
    campo: "numeroIdentificacion",
    codigo: "EMPATE_EN_CAMPO",
    valorReferencia: "111",
  });
  assert.match(r.valor, /empate/);
  assert(!r.valor.includes("111"));
});
test("una mayoría relativa no se presenta como valor a corregir", () => {
  const d = completo();
  d.resultadoComparacion.campos[1].mayoritario.esMayoriaAbsoluta = false;
  assert.match(
    coincidenciaHallazgo(d, { campo: "numeroIdentificacion" }).valor,
    /evidencia suficiente/,
  );
});
test("una fuente única no se presenta como mayoría", () => {
  const d = completo();
  d.resultadoComparacion.campos[1].fuentesIndependientes = 1;
  assert.match(
    coincidenciaHallazgo(d, { campo: "numeroIdentificacion" }).valor,
    /evidencia suficiente/,
  );
});
test("una fecha o período esperado no se confunde con coincidencia entre personas", () => {
  assert.match(
    coincidenciaHallazgo(completo(), {
      campo: "periodoSalud",
      valorReferencia: "2026-10",
    }).valor,
    /No aplica/,
  );
});
