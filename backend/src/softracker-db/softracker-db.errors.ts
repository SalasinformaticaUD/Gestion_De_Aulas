/**
 * Clasificación pura de errores de Softracker y saneo de mensajes para log.
 *
 * `esErrorDeDisponibilidad` decide entre 503 (disponibilidad) y 500 (interno)
 * según códigos de red de Node, SQLSTATE de PostgreSQL y mensajes conocidos de
 * `pg`/`pg-pool`, evaluando también errores envueltos (`cause`, `AggregateError`).
 * `sanitizarParaLog` arma el texto a registrar sin exponer la cadena de conexión
 * ni la contraseña (Req. 1.7, 1.8, 1.11, 1.12).
 */

/** Códigos de red de Node que indican que Softracker no está disponible (Req. 1.7). */
export const CODIGOS_RED_NO_DISPONIBLE: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ETIMEDOUT',
  'ECONNRESET',
  'ENETUNREACH',
  'EAI_AGAIN',
]);

/**
 * SQLSTATE que indican no disponibilidad.
 * La clase `08` (excepciones de conexión) se detecta por prefijo, no por este
 * conjunto; aquí van los códigos puntuales de autenticación, apagado y timeout.
 */
export const SQLSTATE_NO_DISPONIBLE: ReadonlySet<string> = new Set([
  '28P01', // invalid_password
  '28000', // invalid_authorization_specification
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '57014', // query_canceled (statement_timeout)
]);

/** Mensajes de `pg`/`pg-pool` sin código que indican no disponibilidad (Req. 1.7). */
export const MENSAJES_PG_NO_DISPONIBLE: readonly string[] = [
  'timeout exceeded when trying to connect',
  'Connection terminated due to connection timeout',
  'Connection terminated unexpectedly',
];

const PROFUNDIDAD_MAXIMA = 3;

function obtenerCadena(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null;
}

/** `true` si el nivel actual (sin recursión) cumple alguna regla de disponibilidad. */
function nivelEsDisponibilidad(error: Record<string, unknown>): boolean {
  const code = obtenerCadena(error.code);
  if (code !== null) {
    if (CODIGOS_RED_NO_DISPONIBLE.has(code)) {
      return true;
    }
    if (code.length === 5 && code.startsWith('08')) {
      return true;
    }
    if (SQLSTATE_NO_DISPONIBLE.has(code)) {
      return true;
    }
  }

  const message = obtenerCadena(error.message);
  if (
    message !== null &&
    MENSAJES_PG_NO_DISPONIBLE.some((conocido) => message.includes(conocido))
  ) {
    return true;
  }

  return false;
}

/**
 * Decide si `error` representa indisponibilidad de Softracker (→ 503).
 *
 * Evalúa el nivel actual y recursivamente `error.cause` y cada elemento de
 * `error.errors` (`AggregateError`) hasta profundidad 3. Valores que no son
 * objetos, `25006`, `42P01`, `42501` y cualquier otro caso devuelven `false`
 * (→ 500) (Req. 1.7, 1.8, 1.11, 1.12).
 */
export function esErrorDeDisponibilidad(error: unknown): boolean {
  return evaluar(error, 0);
}

function evaluar(error: unknown, profundidad: number): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }

  const registro = error as Record<string, unknown>;

  if (nivelEsDisponibilidad(registro)) {
    return true;
  }

  if (profundidad >= PROFUNDIDAD_MAXIMA) {
    return false;
  }

  if (evaluar(registro.cause, profundidad + 1)) {
    return true;
  }

  const errores = registro.errors;
  if (Array.isArray(errores)) {
    for (const anidado of errores) {
      if (evaluar(anidado, profundidad + 1)) {
        return true;
      }
    }
  }

  return false;
}

function escaparRegExp(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Arma `"<code> <message>"` para registrar en el log y redacta datos sensibles:
 * la cadena de conexión exacta si existe, cualquier subcadena con forma
 * `postgres(ql)://…` hasta el siguiente espacio y la contraseña extraída de la
 * URL si aparece aislada (Req. 1.12).
 */
export function sanitizarParaLog(
  error: unknown,
  connectionString: string | null,
): string {
  let code = '';
  let message = '';

  if (error !== null && typeof error === 'object') {
    const registro = error as Record<string, unknown>;
    code = obtenerCadena(registro.code) ?? '';
    message = obtenerCadena(registro.message) ?? '';
  } else if (typeof error === 'string') {
    message = error;
  }

  let texto = `${code} ${message}`;

  const REDACTADO = '[REDACTADO]';

  // 1. Cadena de conexión exacta.
  if (connectionString !== null && connectionString.length > 0) {
    texto = texto.replace(
      new RegExp(escaparRegExp(connectionString), 'g'),
      REDACTADO,
    );
  }

  // 2. Contraseña extraída de la URL, si aparece aislada.
  if (connectionString !== null && connectionString.length > 0) {
    try {
      const url = new URL(connectionString);
      const password = url.password;
      if (password.length > 0) {
        texto = texto.replace(
          new RegExp(escaparRegExp(password), 'g'),
          REDACTADO,
        );
      }
    } catch {
      // La cadena de conexión no es una URL válida: nada que extraer.
    }
  }

  // 3. Cualquier subcadena con forma postgres(ql)://… hasta el siguiente espacio.
  texto = texto.replace(/postgres(?:ql)?:\/\/\S*/gi, REDACTADO);

  return texto;
}
