import { TEXTOS_DOCUMENTOS } from './document-classification.fixtures';

// Datos ficticios. Estas estructuras reproducen las etiquetas de los ejemplos,
// sin copiar identificaciones, contactos ni nombres personales reales.
export const TEXTOS_VALIDACION = [
  `${TEXTOS_DOCUMENTOS[0]}
el señor(a) ANA MARIA PEREZ GOMEZ, quien se identifica con
CÉDULA DE CIUDADANÍA No. 001234567 de BOGOTA D.C.
NO REGISTRA SANCIONES NI INHABILIDADES VIGENTES
Bogotá D.C., 19 de noviembre de 2026 - 01:31 pm`,
  `${TEXTOS_DOCUMENTOS[1]}
Bogotá DC, 19 de noviembre del 2026
el(la) señor(a) ANA MARIA PEREZ GOMEZ identificado(a) con Cédula de ciudadanía número 001234567:
NO REGISTRA SANCIONES NI INHABILIDADES VIGENTES`,
  `${TEXTOS_DOCUMENTOS[2]}
hoy jueves 19 de noviembre de 2026, a las 13:40:59
NO SE ENCUENTRA REPORTADO COMO RESPONSABLE FISCAL
Tipo Documento   Cédula de Ciudadanía
No. Identificación   001234567
Código de Verificación 9988776620261119`,
  `${TEXTOS_DOCUMENTOS[3].replace('1/2', '1/1')}
Que siendo las 01:44:46 PM horas del 19/11/2026, el ciudadano identificado con:
Cédula de Ciudadanía Nº 001234567
Apellidos y Nombres: PEREZ GOMEZ ANA MARIA
NO TIENE ASUNTOS PENDIENTES CON LAS AUTORIDADES JUDICIALES`,
  `${TEXTOS_DOCUMENTOS[4]}
Que a la fecha, 19/11/2026 01:47:18 p. m. el ciudadano con Cédula de Ciudadanía Nº. 001234567.
NO TIENE MEDIDAS CORRECTIVAS PENDIENTES POR CUMPLIR.`,
  `${TEXTOS_DOCUMENTOS[5]}
Que siendo las 13:49:00 horas del 19/11/2026, el ciudadano identificado con cédula de ciudadanía No. 001234567,
Apellidos y Nombres PEREZ GOMEZ ANA MARIA
NO REGISTRA INHABILIDAD
La presente consulta se tendrá en consideración por la entidad Universidad Distrital, con NIT 899999230-7`,
  `${TEXTOS_DOCUMENTOS[6]}
identificación CC 001234567 NO SE ENCUENTRA INSCRITO EN EL REGISTRO DE DEUDORES ALIMENTARIOS MOROSOS
Se expide en Bogotá el 19/11/2026 01:51 PM
Válida hasta: 19/02/2027`,
  `${TEXTOS_DOCUMENTOS[7]}
Código: GC-PR-002-FR-038
Versión: 04
Fecha de Aprobación: 2026/07/09
Yo, Ana Maria Perez Gomez, identificado (a) con la Cédula de Ciudadanía No. 001234567 de Bogotá D.C., manifiesto
bajo la gravedad del juramento que no me encuentro incurso en ninguna inhabilidad e incompatibilidad.
Dada en Bogotá D.C., a los 19 días del mes de Noviembre del año 2026.
Atentamente,
____________________
Firma`,
];
