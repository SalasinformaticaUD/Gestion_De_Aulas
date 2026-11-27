import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';
import { Injectable } from '@nestjs/common';
import {
  normalizarDato,
  distanciaEdicion,
  esRotacionNombre,
} from './personal-data.normalization';
import {
  CAMPOS_PERSONALES,
  type CampoPersonal,
  type DocumentoPersonal,
  type ObservacionPersonal,
  type ResultadoCampo,
  type GrupoComparacion,
  type HallazgoPersonal,
} from './personal-data.types';
const ETIQUETAS: Record<string, string> = {
  nombreCompleto: 'Nombre completo',
  primerNombre: 'Primer nombre',
  segundoNombre: 'Segundo nombre',
  primerApellido: 'Primer apellido',
  segundoApellido: 'Segundo apellido',
  numeroIdentificacion: 'Número de identificación',
  tipoIdentificacion: 'Tipo de identificación',
  fechaNacimiento: 'Fecha de nacimiento',
  lugarExpedicion: 'Lugar de expedición',
  fechaExpedicion: 'Fecha de expedición de la identificación',
  lugarNacimiento: 'Lugar de nacimiento',
  nacionalidad: 'Nacionalidad',
  sexo: 'Sexo',
  correo: 'Correo electrónico',
  telefono: 'Teléfono',
};
export const VERSION_COMPARACION = 'comparacion-v2';

@Injectable()
export class PersonalDataComparisonService {
  comparar(
    documentos: DocumentoPersonal[],
    referencia?: Partial<Record<CampoPersonal, string>>,
  ) {
    const observaciones: ObservacionPersonal[] = documentos
      .filter((doc) => DOCUMENTOS_REQUERIDOS.some((d) => d.tipo === doc.tipo))
      .flatMap((doc) =>
        doc.datos.map((d) => ({
          ...normalizarDato(d),
          documentoIndice: doc.documentoIndice,
          tipo: doc.tipo,
        })),
      );
    // Solo invertir una presentación que explícitamente diga apellidos/nombres.
    // Si esa inversión puede corresponder a varias identidades, no se elige una.
    const nombresBase = [
      ...new Set(
        observaciones
          .filter(
            (o) =>
              o.campo === 'nombreCompleto' &&
              o.ordenNombre !== 'APELLIDOS_NOMBRES' &&
              o.normalizado,
          )
          .map((o) => o.normalizado!),
      ),
    ];
    for (const o of observaciones.filter(
      (o) =>
        o.campo === 'nombreCompleto' &&
        o.ordenNombre === 'APELLIDOS_NOMBRES' &&
        o.normalizado,
    )) {
      const compatibles = nombresBase.filter((n) =>
        esRotacionNombre(n, o.normalizado!),
      );
      if (compatibles.length === 1) o.normalizado = compatibles[0];
      else if (compatibles.length > 1) {
        o.normalizado = null;
        o.motivo = 'ORDEN_NOMBRE_AMBIGUO';
      }
    }
    const campos: ResultadoCampo[] = [];
    const hallazgos: HallazgoPersonal[] = [];
    for (const campo of CAMPOS_PERSONALES) {
      const datos = observaciones.filter((o) => o.campo === campo),
        validos = datos.filter((o) => o.normalizado !== null);
      const grupos: GrupoComparacion[] = [
        ...new Set(validos.map((o) => o.normalizado!)),
      ].map((valor) => ({
        valor,
        votos: 0,
        observaciones: validos.filter((o) => o.normalizado === valor),
      }));
      const tipos = [...new Set(validos.map((o) => o.tipo))];
      const tiposEnConflicto = tipos.filter(
        (tipo) =>
          new Set(
            validos.filter((o) => o.tipo === tipo).map((o) => o.normalizado),
          ).size > 1,
      );
      for (const grupo of grupos)
        grupo.votos = new Set(
          grupo.observaciones
            .filter((o) => !tiposEnConflicto.includes(o.tipo))
            .map((o) => o.tipo),
        ).size;
      const ranking = [...grupos].sort((a, b) => b.votos - a.votos),
        fuentesIndependientes = tipos.filter(
          (t) => !tiposEnConflicto.includes(t),
        ).length;
      const max = ranking[0]?.votos ?? 0,
        empate = max > 0 && ranking.filter((g) => g.votos === max).length > 1;
      const mayoritario =
        !empate && max >= 2
          ? {
              valor: ranking[0].valor,
              votos: max,
              esMayoriaAbsoluta: max > fuentesIndependientes / 2,
            }
          : null;
      let estado: ResultadoCampo['estado'];
      if (!datos.length) estado = 'SIN_DATOS';
      else if (tiposEnConflicto.length && fuentesIndependientes < 2)
        estado = 'CONFLICTO_INTERNO';
      else if (fuentesIndependientes < 2) estado = 'INFORMACION_INSUFICIENTE';
      else if (empate) estado = 'EMPATE';
      else if (grupos.length === 1)
        estado =
          new Set(datos.map((o) => o.original)).size === 1
            ? 'COINCIDENCIA_EXACTA'
            : 'COINCIDENCIA_NORMALIZADA';
      else if (mayoritario && !mayoritario.esMayoriaAbsoluta)
        estado = 'MAYORIA_RELATIVA';
      else estado = 'DIFERENCIAS';
      const resultado: ResultadoCampo = {
        campo,
        estado,
        documentosDisponibles: new Set(datos.map((o) => o.documentoIndice))
          .size,
        fuentesIndependientes,
        grupos,
        noInterpretables: datos.filter((o) => o.normalizado === null),
        tiposEnConflicto,
        mayoritario,
      };
      if (referencia?.[campo]) {
        const original = referencia[campo];
        const normalizado = normalizarDato({
          campo,
          original,
          pagina: 0,
          regla: 'referencia-ingresada',
        }).normalizado;
        resultado.referenciaIngresada = {
          original,
          normalizado,
          coincide:
            normalizado && grupos.length === 1
              ? normalizado === grupos[0].valor
              : null,
        };
      }
      campos.push(resultado);
      for (const indice of new Set(datos.map((o) => o.documentoIndice))) {
        const propios = datos.filter((o) => o.documentoIndice === indice);
        const originales = [...new Set(propios.map((o) => o.original))],
          paginas = [...new Set(propios.map((o) => o.pagina))].sort(
            (a, b) => a - b,
          );
        let codigo: string | undefined;
        const conflictivos = propios.some((o) =>
          tiposEnConflicto.includes(o.tipo),
        );
        if (conflictivos) codigo = 'CONFLICTO_INTERNO_CAMPO';
        else if (propios.some((o) => o.normalizado === null))
          codigo = 'DATO_NO_INTERPRETABLE';
        else if (estado === 'INFORMACION_INSUFICIENTE')
          codigo = 'INFORMACION_INSUFICIENTE_CAMPO';
        else if (estado === 'EMPATE') codigo = 'EMPATE_EN_CAMPO';
        else if (
          estado === 'MAYORIA_RELATIVA' ||
          (grupos.length > 1 && !mayoritario?.esMayoriaAbsoluta)
        )
          codigo = 'SIN_CONSENSO_EN_CAMPO';
        else if (
          mayoritario?.esMayoriaAbsoluta &&
          propios.some((o) => o.normalizado !== mayoritario.valor)
        ) {
          const encontrado = propios[0].normalizado!;
          let distancia = distanciaEdicion(encontrado, mayoritario.valor);
          if (
            campo === 'nombreCompleto' &&
            (propios.some((o) => o.ordenNombre === 'APELLIDOS_NOMBRES') ||
              grupos
                .find((g) => g.valor === mayoritario.valor)
                ?.observaciones.some(
                  (o) => o.ordenNombre === 'APELLIDOS_NOMBRES',
                ))
          ) {
            const tokens = encontrado.split(' ');
            distancia = Math.min(
              ...tokens.map((_, i) =>
                distanciaEdicion(
                  [...tokens.slice(i), ...tokens.slice(0, i)].join(' '),
                  mayoritario.valor,
                ),
              ),
            );
          }
          codigo =
            campo === 'numeroIdentificacion'
              ? /^\d+$/.test(encontrado) && /^\d+$/.test(mayoritario.valor)
                ? 'DIFERENCIA_NUMERICA'
                : 'DIFERENCIA_IDENTIFICACION'
              : campo === 'tipoIdentificacion'
                ? 'DIFERENCIA_TIPO_IDENTIFICACION'
                : campo.startsWith('fecha')
                  ? 'DIFERENCIA_FECHA'
                  : distancia <=
                      Math.max(
                        1,
                        Math.floor(
                          Math.max(
                            encontrado.length,
                            mayoritario.valor.length,
                          ) * 0.15,
                        ),
                      )
                    ? 'DIFERENCIA_ORTOGRAFICA'
                    : 'VALOR_PERSONAL_DIFERENTE';
        }
        if (!codigo) continue;
        const valorReferencia = mayoritario?.esMayoriaAbsoluta
          ? grupos.find((g) => g.valor === mayoritario.valor)?.observaciones[0]
              ?.original
          : undefined;
        hallazgos.push({
          documentoIndice: indice,
          pagina: paginas[0],
          codigo,
          campo,
          valorEncontrado: originales.join(' | '),
          ...(valorReferencia ? { valorReferencia } : {}),
          observacion: `${DOCUMENTOS_REQUERIDOS.find((d) => d.tipo === propios[0].tipo)?.nombre ?? propios[0].tipo}, página(s) ${paginas.join(', ')}: ${ETIQUETAS[campo] ?? campo}. ${codigo === 'CONFLICTO_INTERNO_CAMPO' ? 'Hay valores contradictorios en el documento o entre ejemplares del mismo tipo; esa fuente no participa en la votación.' : codigo === 'DATO_NO_INTERPRETABLE' ? 'El dato no se puede interpretar sin ambigüedad.' : codigo === 'INFORMACION_INSUFICIENTE_CAMPO' ? 'No hay dos tipos documentales independientes con información comparable.' : codigo === 'EMPATE_EN_CAMPO' ? 'Hay un empate entre los valores encontrados; no se establece una referencia.' : codigo === 'SIN_CONSENSO_EN_CAMPO' ? 'No hay mayoría absoluta suficiente para establecer una referencia.' : 'El dato difiere del valor que más coincide entre los documentos.'}`,
          accionSugerida:
            'Revisar los valores originales y confirmar la información antes de corregirla. La coincidencia mayoritaria no demuestra que un dato sea verdadero.',
          requiereRevisionManual: true,
          evidencia: { paginas, originales, grupos },
        });
      }
    }
    return {
      version: VERSION_COMPARACION,
      campos,
      hallazgos,
      resumen: {
        camposConDiferencias: campos.filter(
          (c) =>
            [
              'DIFERENCIAS',
              'EMPATE',
              'MAYORIA_RELATIVA',
              'CONFLICTO_INTERNO',
            ].includes(c.estado) || c.tiposEnConflicto.length > 0,
        ).length,
        camposConEmpate: campos.filter((c) => c.estado === 'EMPATE').length,
        camposCoincidentes: campos.filter((c) =>
          c.estado.startsWith('COINCIDENCIA'),
        ).length,
        camposInsuficientes: campos.filter(
          (c) =>
            ['SIN_DATOS', 'INFORMACION_INSUFICIENTE'].includes(c.estado) ||
            c.noInterpretables.length > 0,
        ).length,
      },
    };
  }
}
