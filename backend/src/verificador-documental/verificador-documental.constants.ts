export const DOCUMENTOS_REQUERIDOS = [
  { tipo: 'PERSONERIA', nombre: 'Antecedentes de Personería Distrital' },
  { tipo: 'PROCURADURIA', nombre: 'Antecedentes de Procuraduría' },
  { tipo: 'CONTRALORIA', nombre: 'Antecedentes de Contraloría' },
  { tipo: 'POLICIA_JUDICIAL', nombre: 'Antecedentes de Policía Judicial' },
  { tipo: 'MEDIDAS_CORRECTIVAS', nombre: 'Registro de medidas correctivas' },
  { tipo: 'DELITOS_SEXUALES', nombre: 'Inhabilidades por delitos sexuales' },
  {
    tipo: 'REDAM',
    nombre: 'Registro de Deudores Alimentarios Morosos (REDAM)',
  },
  {
    tipo: 'DECLARACION_VERACIDAD',
    nombre: 'Declaración de veracidad GC-PR-002-FR-038',
  },
] as const;

export const LIMITES_CARGA = {
  maxArchivos: 20,
  maxArchivoBytes: 20 * 1024 * 1024,
  maxTotalBytes: 60 * 1024 * 1024,
  maxPaginasPorArchivo: 500,
} as const;
