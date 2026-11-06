// Tipos del módulo monitoreo-software: filas crudas leídas de Softracker y
// forma de la respuesta del endpoint de filtros.

// --- Filas leídas de Softracker ---
// Los tipos admiten `null` aunque el esquema de Softracker declare `NOT NULL`,
// porque las columnas vienen de vistas que pueden cambiar.

export interface FilaAula {
  sala_codigo: string | null;
}

export interface FilaSoftware {
  id: string;
  nombre: string;
  categoria: string | null;
}

export interface FilaCategoria {
  categoria: string | null;
}

// --- Respuesta del endpoint ---

export interface SoftwareFiltro {
  id: string;
  nombre: string;
  categoria: string | null;
}

export interface RespuestaFiltros {
  aulas: string[]; // únicas, no vacías, orden ascendente
  software: SoftwareFiltro[]; // ACTIVO, id único, orden (nombre, id)
  categorias: string[]; // únicas, no vacías, orden ascendente
  generadoEn: string; // ISO 8601 UTC, p. ej. "2026-10-07T14:05:00.000Z"
}
