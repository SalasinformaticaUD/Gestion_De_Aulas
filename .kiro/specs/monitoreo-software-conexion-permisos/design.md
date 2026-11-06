# Design Document

## Overview

Este diseño implementa el **Incremento 1 — Conexión y permisos** del plan `PLAN_MODULO_MONITOREO_SOFTWARE.md`. Agrega al backend NestJS:

- un módulo global `SoftrackerDbModule` con un `pg.Pool` propio, perezoso y de solo lectura hacia la base de Softracker;
- la variable `SOFTRACKER_DATABASE_URL` en `.env.example`, `docker-compose.yml`, `environment.ts` y el preflight de despliegue;
- el módulo de permisos `MONITOREO_SOFTWARE` (`LEER`, `EXPORTAR`) en `MODULOS`, el seed y una migración de datos idempotente;
- el módulo `MonitoreoSoftwareModule` con `GET /monitoreo-software/filtros` y una caché mínima de 1 hora.

Quedan fuera `/consulta`, `/sesiones`, la exportación, el `MonitoreoSoftwareCacheService` general y el frontend.

### Hallazgos del código actual que condicionan el diseño

| Hallazgo | Fuente | Consecuencia |
| --- | --- | --- |
| `pg@^8.23.0` y `@types/pg@^8.23.1` ya son dependencias directas (instalado `pg@8.23.0`, `pg-pool@3.14.0`). | `backend/package.json`, `node_modules` | No se agregan dependencias de runtime. |
| `fast-check@3.23.2` existe solo como dependencia transitiva (`prisma → @prisma/config → effect`). | `npm ls fast-check` | Se agrega `"fast-check": "3.23.2"` a `devDependencies` con versión fijada, igual a la ya resuelta en el lockfile. |
| Los guards globales (`AuthenticationGuard`, `AdministratorGuard`, `ModulePermissionsGuard`, `PermissionsGuard`) se registran con `APP_GUARD` en `AuthModule` y se ejecutan en ese orden antes del handler. | `src/auth/auth.module.ts` | La caché y la consulta solo se alcanzan si los guards aceptan la solicitud (Req. 4.10–4.12, 5.5, 5.6). |
| `ModulePermissionsGuard` y `PermissionsGuard` aceptan todo con `PERMISSIONS_MODE=permissive`; `AuthenticationGuard` exige token solo si `AUTH_REQUIRED` o `PERMISSIONS_MODE=strict` lo determinan. | `src/auth/guards/*.ts` | Las respuestas 401/403 de la Req. 4 aplican en modo estricto (valor por defecto y el de `docker-compose.yml`). Las pruebas E2E fijan `PERMISSIONS_MODE=strict`. |
| Los módulos del usuario se derivan de sus permisos (`modulos` = módulos activos de los permisos de sus roles). | `src/auth/auth.service.ts` | Un usuario "con acceso al módulo pero sin `LEER`" es uno que solo tiene `MONITOREO_SOFTWARE_EXPORTAR` (Req. 4.12, 6.9). |
| `HttpExceptionFilter` hace `console.error(exception)` para estados ≥ 500 y responde `{ statusCode, message, error, path, timestamp }`. | `src/common/filters/http-exception.filter.ts` | Las excepciones 503/500 no deben llevar `cause` con el error de `pg`, para que el log del filtro no reproduzca datos sensibles. |
| `main.ts` no llama a `app.enableShutdownHooks()`. | `src/main.ts` | Sin ese llamado, `onModuleDestroy` no se ejecuta con `SIGTERM` (`docker stop`). Se agrega en `bootstrap()` (no en `configureApp`, para no alterar las pruebas). |
| El servicio `backend` de `docker-compose.yml` fija `NODE_ENV: production`. | `backend/docker-compose.yml` | Con la Req. 2.3, un despliegue Compose sin `SOFTRACKER_DATABASE_URL` falla en `environment.validate()` antes de crear la app. Ver la nota sobre la Req. 1.5 en "Error Handling". |
| El patrón de caché del panel guarda `{ expiraEn, valor: Promise }`, borra la entrada en `.catch` y usa `Date.now()`. | `src/panel-operativo/panel-operativo.service.ts` | Se reproduce para una sola entrada, con reloj inyectable. |
| La migración `20261006170000_installation_permissions_and_dashboard_dismissals` usa `INSERT … ON CONFLICT` sobre `Modulo`, `Permiso` y `RolPermiso`. | `prisma/migrations/…/migration.sql` | La nueva migración copia la estructura con códigos explícitos. |
| En Softracker, `software_catalogo.id`, `nombre` y `categoria` son `text NOT NULL`; `estado` está restringido a `ACTIVO`, `REVISION`, `EXCLUIDO`; `sala_codigo` es `text NOT NULL`. | `Softracker/PLAN_FILTRO_SOFTWARE_ACADEMICO.md` | Todos los campos de la respuesta son `string`. Los filtros de nulos y vacíos se mantienen por defensa (las vistas pueden cambiar). |
| `pg-pool@3.14.0` rechaza con `Error('timeout exceeded when trying to connect')` cuando no obtiene conexión libre a tiempo, y `pg` con `Error('Connection terminated due to connection timeout')` cuando vence `connectionTimeoutMillis`. | `node_modules/pg-pool/index.js` | Esos mensajes se clasifican como Error_De_Disponibilidad (Req. 1.7, 1.12). |

### Decisiones de diseño

1. **Pool perezoso.** El `pg.Pool` se crea en la primera invocación de `consultar`, no en el constructor ni en `onModuleInit`. Así el arranque no lee la URL ni abre sockets (Req. 1.4, 1.5).
2. **Solo lectura en dos capas.** Además del rol `softracker_readonly`, cada conexión se abre con `options: '-c default_transaction_read_only=on'` (Req. 1.11).
3. **Clasificación de errores en una función pura.** `esErrorDeDisponibilidad(error)` decide entre 503 y 500 por códigos de red, SQLSTATE y mensajes conocidos de `pg`. Al ser pura, se cubre con PBT.
4. **Respuesta de filtros construida en una función pura.** Las consultas devuelven filas crudas; `construirRespuestaFiltros` deduplica, descarta vacíos y ordena con un comparador determinista por unidades de código. No dependemos de la collation de PostgreSQL, lo que hace el orden verificable.
5. **Caché de una entrada con reloj inyectable.** Se inyecta `RELOJ_MONITOREO` (`() => number`) para probar expiración sin temporizadores falsos.
6. **Tres `SELECT` en paralelo** con `Promise.all`. Si uno falla, falla toda la solicitud y no se devuelve respuesta parcial (Req. 4.13).
7. **Fábrica de pool inyectable** (`SOFTRACKER_POOL_FACTORY`) para que las pruebas unitarias usen un pool simulado sin abrir conexiones (Req. 6.4).

## Architecture

```mermaid
flowchart LR
    subgraph Backend NestJS
        G[Guards globales<br/>Authentication → Administrator → ModulePermissions → Permissions]
        C[MonitoreoSoftwareController<br/>/monitoreo-software]
        S[MonitoreoSoftwareService<br/>caché de filtros 1 h]
        M[construirRespuestaFiltros<br/>función pura]
        D[SoftrackerDbService<br/>pg.Pool perezoso, solo lectura]
        E[esErrorDeDisponibilidad<br/>función pura]
        P[PrismaService<br/>BD Gestión de Aulas]
        F[HttpExceptionFilter]
    end
    U[Cliente HTTP] --> G --> C --> S
    S --> M
    S --> D
    D --> E
    D -- "pg.Pool max 5, options read_only" --> SDB[(Softracker_DB<br/>rol softracker_readonly)]
    P --> ADB[(BD Gestión de Aulas)]
    C -. excepciones .-> F
```

`SoftrackerDbService` y `PrismaService` no comparten pool ni cliente (Req. 1.3). Ningún módulo existente cambia de comportamiento: `SoftrackerDbModule` solo crea conexiones cuando alguien invoca `consultar`.

### Flujo de `GET /monitoreo-software/filtros`

```mermaid
sequenceDiagram
    actor Usuario
    participant G as Guards globales
    participant C as Controller
    participant S as MonitoreoSoftwareService
    participant D as SoftrackerDbService
    participant DB as Softracker_DB

    Usuario->>G: GET /monitoreo-software/filtros
    alt Sin token (modo estricto)
        G-->>Usuario: 401 (sin tocar caché ni BD)
    else Sin módulo o sin MONITOREO_SOFTWARE_LEER
        G-->>Usuario: 403 (sin tocar caché ni BD)
    else Autorizado
        G->>C: continúa
        C->>S: obtenerFiltros()
        alt Entrada vigente (expiraEn > ahora)
            S-->>C: Promise almacenada
        else Sin entrada o vencida
            S->>S: guarda { expiraEn: ahora + 3 600 000, valor }
            par
                S->>D: consultar(SQL aulas, [])
                S->>D: consultar(SQL software, ['ACTIVO'])
                S->>D: consultar(SQL categorías, ['ACTIVO'])
            end
            D->>DB: SELECT parametrizados (pool perezoso)
            alt Éxito
                DB-->>D: filas
                D-->>S: filas
                S->>S: construirRespuestaFiltros(filas, generadoEn)
            else Error_De_Disponibilidad
                D-->>S: ServiceUnavailableException
                S->>S: borra la entrada
            end
        end
        S-->>C: RespuestaFiltros o excepción
        C-->>Usuario: 200 o 503 (HttpExceptionFilter)
    end
```

## Components and Interfaces

### 1. `backend/src/softracker-db/`

Archivos:

```text
softracker-db/
  softracker-db.module.ts
  softracker-db.service.ts
  softracker-db.service.spec.ts
  softracker-db.errors.ts
  softracker-db.errors.spec.ts
  softracker-db.constants.ts
```

**`softracker-db.constants.ts`**

```typescript
import type { PoolConfig } from 'pg';
import { Pool } from 'pg';

export const SOFTRACKER_POOL_FACTORY = Symbol('SOFTRACKER_POOL_FACTORY');
export type SoftrackerPoolFactory = (config: PoolConfig) => Pool;
export const crearPoolPg: SoftrackerPoolFactory = (config) => new Pool(config);

export const MENSAJE_SOFTRACKER_NO_DISPONIBLE =
  'El servicio de monitoreo de software no está disponible en este momento.';
export const MENSAJE_SOFTRACKER_ERROR_INTERNO =
  'No fue posible completar la consulta de monitoreo de software.';

/** Configuración fija del pool (Req. 1.2 y 1.11). */
export function construirConfigPool(connectionString: string): PoolConfig {
  return {
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    application_name: 'gestion-aulas',
    options: '-c default_transaction_read_only=on',
  };
}
```

**`softracker-db.module.ts`**

```typescript
@Global()
@Module({
  providers: [
    SoftrackerDbService,
    { provide: SOFTRACKER_POOL_FACTORY, useValue: crearPoolPg },
  ],
  exports: [SoftrackerDbService],
})
export class SoftrackerDbModule {}
```

Se importa una sola vez en `AppModule` (Req. 1.1).

**`softracker-db.service.ts`**

```typescript
@Injectable()
export class SoftrackerDbService implements OnModuleDestroy {
  private readonly logger = new Logger(SoftrackerDbService.name);
  private pool: Pool | null = null;
  private connectionString: string | null = null;

  constructor(
    @Inject(SOFTRACKER_POOL_FACTORY)
    private readonly crearPool: SoftrackerPoolFactory,
  ) {}

  async consultar<T extends QueryResultRow>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<T[]>;

  async onModuleDestroy(): Promise<void>;
}
```

Comportamiento de `consultar`:

1. Lee `process.env.SOFTRACKER_DATABASE_URL` (igual que `monitores-client.service.ts` lee sus variables). Si es `undefined`, vacía o solo espacios, lanza `ServiceUnavailableException(MENSAJE_SOFTRACKER_NO_DISPONIBLE)` sin crear el pool (Req. 1.9).
2. Si `this.pool` es `null`, guarda la URL recortada en `this.connectionString`, crea el pool con `this.crearPool(construirConfigPool(url))` y registra `pool.on('error', …)`. Ese listener es obligatorio: `pg.Pool` emite `error` cuando un cliente inactivo pierde la conexión, y sin listener Node termina el proceso. El listener solo registra el error saneado.
3. Ejecuta `await this.pool.query<T>(sql, [...params])`. `pg` envía `sql` y los valores por separado (protocolo extendido), así que los valores nunca se interpolan en el texto (Req. 1.6).
4. Devuelve `resultado.rows` (arreglo vacío si no hay filas).
5. En `catch`, registra con `this.logger.error` un mensaje saneado con `sanitizarParaLog(error, this.connectionString)` que contiene el código (`code`) y el mensaje del error, sin `sql` ni `params`. Luego:
   - si `esErrorDeDisponibilidad(error)` → `throw new ServiceUnavailableException(MENSAJE_SOFTRACKER_NO_DISPONIBLE)`;
   - si no → `throw new InternalServerErrorException(MENSAJE_SOFTRACKER_ERROR_INTERNO)`.
   - Ninguna de las dos excepciones recibe `{ cause }` (ver hallazgo sobre `HttpExceptionFilter`).
   - Si el error ya es una `HttpException` (no ocurre con `pg`, pero protege ante cambios), se relanza tal cual.

`onModuleDestroy`: si `this.pool` existe, `await this.pool.end()`; si falla, registra el error saneado y no relanza. Después deja `this.pool = null` (Req. 1.10).

La URL se lee en la primera consulta y se conserva mientras exista el pool. Cambiarla exige reiniciar el backend, igual que `DATABASE_URL`.

**`softracker-db.errors.ts`** (funciones puras)

```typescript
export const CODIGOS_RED_NO_DISPONIBLE: ReadonlySet<string>;
export const SQLSTATE_NO_DISPONIBLE: ReadonlySet<string>;
export const MENSAJES_PG_NO_DISPONIBLE: readonly string[];

export function esErrorDeDisponibilidad(error: unknown): boolean;
export function sanitizarParaLog(error: unknown, connectionString: string | null): string;
```

Reglas de `esErrorDeDisponibilidad` (cualquiera basta):

| Regla | Valores |
| --- | --- |
| `code` de red de Node | `ECONNREFUSED`, `ENOTFOUND`, `EHOSTUNREACH`, `ETIMEDOUT`, `ECONNRESET`. Se proponen además `ENETUNREACH` y `EAI_AGAIN` (red caída y DNS temporal), que tienen el mismo significado operativo. |
| SQLSTATE clase 08 (excepciones de conexión) | `code` de 5 caracteres que empieza por `08` (`08000`, `08001`, `08003`, `08004`, `08006`, `08P01`, …). |
| Autenticación | `28P01` (contraseña inválida), `28000` (autorización inválida). |
| Operador / apagado | `57P01` (admin_shutdown), `57P02` (crash_shutdown), `57P03` (cannot_connect_now). |
| `statement_timeout` | `57014` (query_canceled). |
| Mensajes de `pg`/`pg-pool` sin código | `message` que contiene `timeout exceeded when trying to connect`, `Connection terminated due to connection timeout` o `Connection terminated unexpectedly`. |
| Errores envueltos | Se evalúan recursivamente `error.cause` y cada elemento de `error.errors` (`AggregateError`, que Node produce al intentar varias direcciones de un mismo host), hasta una profundidad de 3. |

Cualquier otro valor, incluido el SQLSTATE `25006` (`read_only_sql_transaction`, rechazo de escritura), `42P01` (vista inexistente), `42501` (permiso denegado sobre la vista) o valores que no son objetos, devuelve `false` y termina en `InternalServerErrorException` (Req. 1.8, 1.11).

`sanitizarParaLog` arma `"<code> <message>"` y reemplaza por `[REDACTADO]`: la cadena de conexión exacta si existe, cualquier subcadena con forma `postgres(ql)://…` hasta el siguiente espacio, y la contraseña extraída de la URL si aparece aislada.

### 2. `backend/src/monitoreo-software/`

```text
monitoreo-software/
  monitoreo-software.module.ts
  monitoreo-software.controller.ts
  monitoreo-software.service.ts
  monitoreo-software.service.spec.ts
  monitoreo-software.constants.ts
  monitoreo-software.types.ts
  filtros.mapper.ts
  filtros.mapper.spec.ts
```

**`monitoreo-software.constants.ts`**

```typescript
export const RELOJ_MONITOREO = Symbol('RELOJ_MONITOREO');
export type RelojMonitoreo = () => number;
export const TTL_FILTROS_MS = 3_600_000;
export const ESTADO_SOFTWARE_ACTIVO = 'ACTIVO';
export const PERMISO_MONITOREO_LEER = 'MONITOREO_SOFTWARE_LEER';
```

**`monitoreo-software.module.ts`**

```typescript
@Module({
  controllers: [MonitoreoSoftwareController],
  providers: [
    MonitoreoSoftwareService,
    { provide: RELOJ_MONITOREO, useValue: () => Date.now() },
  ],
})
export class MonitoreoSoftwareModule {}
```

No importa `SoftrackerDbModule` porque es global.

**`monitoreo-software.controller.ts`**

```typescript
@RequireModule(MODULOS.MONITOREO_SOFTWARE)
@Controller('monitoreo-software')
export class MonitoreoSoftwareController {
  constructor(private readonly service: MonitoreoSoftwareService) {}

  @Get('filtros')
  @RequirePermissions(PERMISO_MONITOREO_LEER)
  obtenerFiltros(): Promise<RespuestaFiltros> {
    return this.service.obtenerFiltros();
  }
}
```

El endpoint no recibe query params. Con `ValidationPipe` global (`forbidNonWhitelisted`) y sin DTO, los parámetros extra se ignoran; no se introducen en ninguna consulta.

**`monitoreo-software.service.ts`**

```typescript
@Injectable()
export class MonitoreoSoftwareService {
  private cacheFiltros: { expiraEn: number; valor: Promise<RespuestaFiltros> } | null = null;

  constructor(
    private readonly softracker: SoftrackerDbService,
    @Inject(RELOJ_MONITOREO) private readonly reloj: RelojMonitoreo,
  ) {}

  obtenerFiltros(): Promise<RespuestaFiltros> {
    const ahora = this.reloj();
    const entrada = this.cacheFiltros;
    if (entrada && entrada.expiraEn > ahora) return entrada.valor;

    const valor: Promise<RespuestaFiltros> = this.consultarFiltros(ahora).catch(
      (error: unknown) => {
        // Solo se borra si la entrada sigue siendo la de esta consulta.
        if (this.cacheFiltros?.valor === valor) this.cacheFiltros = null;
        throw error;
      },
    );
    this.cacheFiltros = { expiraEn: ahora + TTL_FILTROS_MS, valor };
    return valor;
  }

  private async consultarFiltros(ahora: number): Promise<RespuestaFiltros> {
    const generadoEn = new Date(ahora).toISOString();
    const [aulas, software, categorias] = await Promise.all([
      this.softracker.consultar<FilaAula>(SQL_AULAS, []),
      this.softracker.consultar<FilaSoftware>(SQL_SOFTWARE, [ESTADO_SOFTWARE_ACTIVO]),
      this.softracker.consultar<FilaCategoria>(SQL_CATEGORIAS, [ESTADO_SOFTWARE_ACTIVO]),
    ]);
    return construirRespuestaFiltros({ aulas, software, categorias }, generadoEn);
  }
}
```

Notas:

- La entrada se guarda de forma síncrona antes de cualquier `await`, por lo que las solicitudes simultáneas encuentran la misma Promise (Req. 5.3).
- La comparación de identidad en el `catch` evita que una consulta fallida antigua borre una entrada más nueva.
- `generadoEn` se toma del mismo instante de la solicitud que originó la consulta. Las respuestas servidas desde caché conservan el `generadoEn` original (Req. 4.7).
- Una sola entrada, sin clave por usuario y sin parámetro de forzado (Req. 5.7).

**Sentencias SQL** (constantes del servicio; ningún valor de la petición entra en ellas):

```sql
-- SQL_AULAS
SELECT DISTINCT sala_codigo
FROM resumen_diario_uso
WHERE sala_codigo IS NOT NULL AND sala_codigo <> '';

-- SQL_SOFTWARE
SELECT DISTINCT id, nombre, categoria
FROM software_catalogo
WHERE estado = $1;

-- SQL_CATEGORIAS
SELECT DISTINCT categoria
FROM software_catalogo
WHERE estado = $1 AND categoria IS NOT NULL AND categoria <> '';
```

El orden y la deduplicación final se hacen en `construirRespuestaFiltros`. Los `WHERE` y `DISTINCT` en SQL reducen el volumen transferido; la función pura garantiza el contrato aunque la vista devuelva duplicados o vacíos.

**`filtros.mapper.ts`** (función pura)

```typescript
export function compararTexto(a: string, b: string): number; // -1/0/1 por unidades de código UTF-16
export function construirRespuestaFiltros(
  filas: { aulas: FilaAula[]; software: FilaSoftware[]; categorias: FilaCategoria[] },
  generadoEn: string,
): RespuestaFiltros;
```

Reglas:

- `aulas`: toma `sala_codigo`, descarta `null`, `undefined`, no-string y valores cuyo `trim()` es vacío; deduplica con `Set`; ordena con `compararTexto` (Req. 4.4).
- `software`: descarta filas sin `id` string no vacío o sin `nombre` string; conserva la primera fila por `id`; ordena por `nombre` y luego por `id` con `compararTexto` (Req. 4.5). `categoria` se conserva tal cual (`string`).
- `categorias`: igual que `aulas` sobre `categoria` (Req. 4.6).
- El resultado contiene exactamente `aulas`, `software`, `categorias` y `generadoEn` (Req. 4.3).

`compararTexto` usa `a < b ? -1 : a > b ? 1 : 0`. Se prefiere a `localeCompare` porque es total, estable entre entornos y no depende de ICU. Para los códigos de aula (`^\d{3}$`) coincide con el orden numérico.

### 3. Permisos

- `src/auth/auth.constants.ts`: agregar `MONITOREO_SOFTWARE: 'MONITOREO_SOFTWARE'` al final de `MODULOS`. No se agrega a `MODULOS_CON_LECTURA_AUXILIAR`.
- `prisma/seed.ts`: agregar `['MONITOREO_SOFTWARE', 'Monitoreo de software']` al final de `modulos` y `MONITOREO_SOFTWARE: ['LEER', 'EXPORTAR']` a `accionesPorModulo`. El bucle existente genera `MONITOREO_SOFTWARE_LEER` y `MONITOREO_SOFTWARE_EXPORTAR` con descripción `"<ACCION> en Monitoreo de software"`.
- Nueva migración `prisma/migrations/20261007120000_monitoreo_software_permissions/migration.sql`:

```sql
-- El módulo de monitoreo de software debe existir sin depender del seed.
INSERT INTO "Modulo" ("id", "codigo", "nombre", "activo")
VALUES (gen_random_uuid(), 'MONITOREO_SOFTWARE', 'Monitoreo de software', true)
ON CONFLICT ("codigo") DO UPDATE
SET "nombre" = EXCLUDED."nombre", "activo" = true;

INSERT INTO "Permiso" ("id", "codigo", "descripcion", "moduloId")
SELECT gen_random_uuid(), catalogo.codigo, catalogo.descripcion, modulo.id
FROM "Modulo" AS modulo
CROSS JOIN (
  VALUES
    ('MONITOREO_SOFTWARE_LEER', 'LEER en Monitoreo de software'),
    ('MONITOREO_SOFTWARE_EXPORTAR', 'EXPORTAR en Monitoreo de software')
) AS catalogo(codigo, descripcion)
WHERE modulo."codigo" = 'MONITOREO_SOFTWARE'
ON CONFLICT ("codigo") DO UPDATE
SET "descripcion" = EXCLUDED."descripcion", "moduloId" = EXCLUDED."moduloId";

-- El administrador conserva acceso total; si el rol no existe, no se inserta nada.
INSERT INTO "RolPermiso" ("rolId", "permisoId")
SELECT rol.id, permiso.id
FROM "Rol" AS rol
CROSS JOIN "Permiso" AS permiso
WHERE rol."nombre" = 'ADMINISTRADOR'
  AND permiso."codigo" IN ('MONITOREO_SOFTWARE_LEER', 'MONITOREO_SOFTWARE_EXPORTAR')
ON CONFLICT ("rolId", "permisoId") DO NOTHING;
```

Se usa `IN (…)` en lugar de `LIKE 'MONITOREO_SOFTWARE_%'` porque en `LIKE` el `_` es comodín. La migración cumple las Req. 3.4–3.9: crea o reactiva el módulo, crea o actualiza los dos permisos, asigna al administrador si existe y es idempotente.

### 4. Configuración

**`backend/.env.example`** (una línea nueva, junto a las demás URL):

```text
# Conexión de solo lectura a Softracker (rol softracker_readonly).
SOFTRACKER_DATABASE_URL=postgresql://softracker_readonly:CHANGE_ME@<host>:<puerto>/<base>
```

**`backend/docker-compose.yml`**, bloque `environment` del servicio `backend`:

```yaml
      SOFTRACKER_DATABASE_URL: ${SOFTRACKER_DATABASE_URL}
```

Sin `:?` para no duplicar la validación: el preflight y `environment.validate()` dan mensajes más claros. Para el host se documenta `host.docker.internal` (ya en `extra_hosts`) o una red Docker compartida; con servidores distintos, túnel o VPN y `sslmode=require` en la URL.

**`src/config/environment.ts`**: agregar `requiredInProduction('SOFTRACKER_DATABASE_URL');` dentro de `validate()`. Reutiliza el mensaje existente `"SOFTRACKER_DATABASE_URL debe configurarse en produccion."` (Req. 2.3, 2.4).

**`src/config/environment.spec.ts`**: agregar `SOFTRACKER_DATABASE_URL: 'postgresql://softracker_readonly:clave@softracker-db:5432/softracker'` al entorno base de `beforeEach` (caso c) y los casos (a) ausente con `delete`, (b) `''`, y además `'   '` en producción, y (d) `NODE_ENV=development` sin la variable (Req. 2.5).

**`scripts/validate-docker-env.cjs`**:

- agregar `'SOFTRACKER_DATABASE_URL'` a `required`, que ya produce `"SOFTRACKER_DATABASE_URL debe configurarse con un valor real."` para ausente, vacía, solo espacios o con `CHANGE_ME` sin distinguir mayúsculas (Req. 2.6);
- agregar un bloque de validación de formato que se salta valores vacíos o con `CHANGE_ME` (para no duplicar errores) y agrega `"SOFTRACKER_DATABASE_URL debe ser una URL PostgreSQL válida."` si `new URL(valor)` lanza o el protocolo no es `postgresql:` ni `postgres:` (Req. 2.7, 2.8);
- los errores se siguen acumulando en `errors` y se imprimen juntos antes de `process.exit(1)` (Req. 2.9).

Para que la validación de formato sea comprobable sin lanzar procesos, la lógica se extrae a una función `validarSoftrackerUrl(valor): string[]` dentro del mismo `.cjs`, exportada con `module.exports` y ejecutada solo si `require.main === module`. El resto del script queda igual.

**`src/main.ts`**: agregar `app.enableShutdownHooks();` después de `configureApp(app)` para que `onModuleDestroy` cierre el pool al recibir `SIGTERM`/`SIGINT`.

### 5. Registro y documentación

- `src/app.module.ts`: importar `SoftrackerDbModule` y `MonitoreoSoftwareModule` al final de `imports`. `reportes.controller.ts` no se toca (Req. 4.14).
- `src/MODULES.md`: fila `monitoreo-software` en la tabla principal (ruta `/monitoreo-software`, módulo `MONITOREO_SOFTWARE`, permiso `MONITOREO_SOFTWARE_LEER`, dependencia de Softracker_DB en solo lectura) y fila `softracker-db` en "Módulos transversales" (sin ruta HTTP; pool `pg` perezoso, global, solo lectura). Se agrega una regla arquitectónica: Gestión de Aulas solo lee Softracker mediante el rol `softracker_readonly` y las vistas `vista_uso_software`, `resumen_diario_uso` y `software_catalogo` (Req. 6.6).
- `package.json`: `"fast-check": "3.23.2"` en `devDependencies`.

## Data Models

No hay cambios en el esquema Prisma. Solo se insertan filas en `Modulo`, `Permiso` y `RolPermiso`.

### Filas leídas de Softracker

```typescript
// monitoreo-software.types.ts
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
```

Los tipos admiten `null` aunque el esquema de Softracker declare `NOT NULL`, porque las columnas vienen de vistas que pueden cambiar.

### Respuesta del endpoint

```typescript
export interface SoftwareFiltro {
  id: string;
  nombre: string;
  categoria: string | null;
}

export interface RespuestaFiltros {
  aulas: string[];           // únicas, no vacías, orden ascendente
  software: SoftwareFiltro[]; // ACTIVO, id único, orden (nombre, id)
  categorias: string[];      // únicas, no vacías, orden ascendente
  generadoEn: string;        // ISO 8601 UTC, p. ej. "2026-10-07T14:05:00.000Z"
}
```

Ejemplo:

```json
{
  "aulas": ["306", "412"],
  "software": [
    { "id": "autocad", "nombre": "AutoCAD", "categoria": "Diseño" },
    { "id": "matlab", "nombre": "MATLAB", "categoria": "Cálculo" }
  ],
  "categorias": ["Cálculo", "Diseño"],
  "generadoEn": "2026-10-07T14:05:00.000Z"
}
```

### Entrada de caché

```typescript
interface EntradaCacheFiltros {
  expiraEn: number;                 // epoch ms = instante de la solicitud + 3 600 000
  valor: Promise<RespuestaFiltros>; // compartida por solicitudes simultáneas
}
```

### Registros de permisos

| Tabla | Registro |
| --- | --- |
| `Modulo` | `codigo = 'MONITOREO_SOFTWARE'`, `nombre = 'Monitoreo de software'`, `activo = true` |
| `Permiso` | `MONITOREO_SOFTWARE_LEER` — "LEER en Monitoreo de software" |
| `Permiso` | `MONITOREO_SOFTWARE_EXPORTAR` — "EXPORTAR en Monitoreo de software" |
| `RolPermiso` | `ADMINISTRADOR` × ambos permisos, si el rol existe |


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Las propiedades se aplican a la lógica propia y pura o simulable: clasificación de errores, `consultar` con pool simulado, validación del preflight, armado de la respuesta y caché. La migración, el registro de módulos, los guards y la configuración estática se cubren con pruebas de ejemplo, E2E o integración (ver "Testing Strategy").

### Property 1: Clasificación total de errores de Softracker

*For any* valor lanzado por `pg` o `pg-pool` (objeto con `code` y/o `message`, posiblemente envuelto en `cause` o en `errors` de un `AggregateError` hasta profundidad 3, o un valor que no es objeto), `esErrorDeDisponibilidad` devuelve `true` si y solo si algún nivel tiene un código de red del conjunto de disponibilidad, un SQLSTATE de clase `08`, `28P01`, `28000`, `57P01`, `57P02`, `57P03` o `57014`, o un mensaje que contiene alguno de los textos conocidos de tiempo agotado o conexión terminada; en cualquier otro caso (incluidos `25006`, `42P01` y `42501`) devuelve `false`.

**Validates: Requirements 1.7, 1.8, 1.11, 1.12**

### Property 2: `consultar` traduce errores sin exponer datos sensibles

*For any* cadena de conexión válida, sentencia `sql`, lista `params` y error lanzado por el pool simulado (cuyo `message` puede contener la cadena de conexión, el `sql` o los `params`), `consultar` rechaza con `ServiceUnavailableException` y el mensaje "El servicio de monitoreo de software no está disponible en este momento." cuando `esErrorDeDisponibilidad(error)` es verdadero, y con `InternalServerErrorException` en caso contrario; el mensaje de la excepción no contiene la cadena de conexión, el `sql` ni la representación de los `params`, y ninguna línea registrada en el log contiene la cadena de conexión.

**Validates: Requirements 1.7, 1.8, 6.4**

### Property 3: `consultar` transporta sentencia, parámetros y filas sin alterarlos

*For any* sentencia `sql`, lista `params` (o `params` omitido) y lista de filas devuelta por el pool simulado, `consultar(sql, params)` invoca `pool.query` exactamente una vez con el mismo texto `sql` y con un arreglo igual a `params` (o `[]` si se omitió), y resuelve con un arreglo igual a las filas devueltas (vacío si no hubo filas).

**Validates: Requirements 1.6**

### Property 4: El pool se crea una sola vez y solo al consultar

*For any* número `n ≥ 0` de invocaciones exitosas de `consultar` sobre un `SoftrackerDbService` recién construido con una URL no vacía, la fábrica de pool se invoca exactamente `min(n, 1)` veces, siempre con la configuración de `construirConfigPool(url)`.

**Validates: Requirements 1.2, 1.4**

### Property 5: Sin URL configurada nunca se abre el pool

*For any* valor de `SOFTRACKER_DATABASE_URL` que sea ausente, vacío o compuesto solo por caracteres de espacio en blanco, y *for any* número `n ≥ 1` de invocaciones de `consultar`, cada invocación rechaza con `ServiceUnavailableException` y el mensaje "El servicio de monitoreo de software no está disponible en este momento.", y la fábrica de pool se invoca 0 veces.

**Validates: Requirements 1.9**

### Property 6: Validación del preflight para `SOFTRACKER_DATABASE_URL`

*For any* valor de entrada, `validarSoftrackerUrl(valor)` devuelve exactamente `["SOFTRACKER_DATABASE_URL debe configurarse con un valor real."]` si el valor es ausente, vacío, de solo espacios o contiene `CHANGE_ME` en cualquier combinación de mayúsculas y minúsculas; devuelve exactamente `["SOFTRACKER_DATABASE_URL debe ser una URL PostgreSQL válida."]` si no se cumple lo anterior y el valor no es interpretable por `new URL` o su protocolo no es `postgresql:` ni `postgres:`; y devuelve `[]` para cualquier URL interpretable con protocolo `postgresql:` o `postgres:` sin `CHANGE_ME`.

**Validates: Requirements 2.6, 2.7, 2.8**

### Property 7: Normalización de aulas y categorías y forma de la respuesta

*For any* listas de filas de aulas y de categorías con valores arbitrarios (cadenas, cadenas vacías, cadenas de solo espacios, `null`, duplicados, incluidas listas vacías), `construirRespuestaFiltros` devuelve un objeto con exactamente las claves `aulas`, `software`, `categorias` y `generadoEn`, donde `aulas` (y respectivamente `categorias`) es igual al conjunto de valores de entrada que son cadenas con contenido distinto de espacios, sin repetidos y en orden estrictamente ascendente según `compararTexto`.

**Validates: Requirements 4.3, 4.4, 4.6, 4.15**

### Property 8: Software sin `id` repetido y ordenado por nombre e `id`

*For any* lista de filas de software (con `id` y `nombre` repetidos, en cualquier orden), la lista `software` de la respuesta contiene cada `id` válido de la entrada exactamente una vez, cada elemento corresponde a una fila de la entrada con ese `id`, y para todo par de elementos consecutivos `(a, b)` se cumple `compararTexto(a.nombre, b.nombre) < 0`, o `a.nombre === b.nombre` y `compararTexto(a.id, b.id) < 0`.

**Validates: Requirements 4.5, 4.15**

### Property 9: Caché secuencial de filtros conforme al modelo

*For any* secuencia de solicitudes de filtros con instantes no decrecientes (incluidos instantes exactamente iguales a `expiraEn`) y *for any* resultado por ronda de consultas (éxito, o fallo de una cualquiera de las tres consultas), al resolver cada solicitud antes de la siguiente: el número de rondas de consulta a Softracker es igual al que predice el modelo "consultar si no hay entrada o `expiraEn ≤ ahora`; tras éxito guardar `expiraEn = ahora_de_la_ronda + 3 600 000`; tras fallo no guardar nada"; cada ronda invoca `consultar` exactamente 3 veces; cada solicitud servida desde caché resuelve con un valor igual al de la ronda que creó la entrada, incluido su `generadoEn` igual a `new Date(ahora_de_esa_ronda).toISOString()`; y cada solicitud de una ronda fallida rechaza con el error de esa ronda sin respuesta parcial.

**Validates: Requirements 4.7, 4.13, 5.1, 5.2, 5.4, 5.7, 6.5, 6.8**

### Property 10: Solicitudes simultáneas comparten una sola consulta

*For any* número `n ≥ 2` de solicitudes de filtros emitidas antes de que termine la primera ronda de consultas, sin entrada vigente en la caché, y *for any* resultado de esa ronda (éxito o fallo), se ejecuta una sola ronda de consultas (3 invocaciones de `consultar`), todas las solicitudes resuelven con el mismo objeto o rechazan con el mismo error, y en caso de fallo la siguiente solicitud ejecuta una nueva ronda.

**Validates: Requirements 5.3, 5.4, 6.7**

## Error Handling

| Situación | Dónde se detecta | Respuesta HTTP | Log |
| --- | --- | --- | --- |
| Sin token (modo estricto) | `AuthenticationGuard` | 401 "Autenticación requerida." | No |
| Sin módulo `MONITOREO_SOFTWARE` | `ModulePermissionsGuard` | 403 "El usuario no tiene acceso al módulo MONITOREO_SOFTWARE." | No |
| Sin `MONITOREO_SOFTWARE_LEER` | `PermissionsGuard` | 403 "El usuario no tiene los permisos requeridos." | No |
| `SOFTRACKER_DATABASE_URL` vacía o ausente al consultar | `SoftrackerDbService.consultar` | 503 "El servicio de monitoreo de software no está disponible en este momento." | `warn` sin datos de conexión |
| Conexión rechazada, host inalcanzable, DNS, autenticación fallida, apagado del servidor | `esErrorDeDisponibilidad` | 503, mismo mensaje | `error` saneado (código + mensaje sin URL) |
| `connectionTimeoutMillis` (5 s), pool agotado (5 s) o `statement_timeout` (10 s) | `esErrorDeDisponibilidad` | 503, mismo mensaje | `error` saneado |
| Escritura rechazada (`25006`), vista inexistente (`42P01`), permiso denegado (`42501`), error de sintaxis u otro | `esErrorDeDisponibilidad` = `false` | 500 "No fue posible completar la consulta de monitoreo de software." | `error` saneado |
| Una de las tres consultas de `/filtros` falla | `Promise.all` en `consultarFiltros` | El código de esa excepción (503 o 500), sin respuesta parcial; la entrada de caché se borra | Según la fila anterior |
| Cliente inactivo del pool pierde la conexión | `pool.on('error')` | Ninguna (no hay solicitud en curso) | `error` saneado; el proceso sigue |
| Fallo de `pool.end()` al apagar | `onModuleDestroy` | Ninguna | `error` saneado; el apagado continúa |

Todas las respuestas de error usan el formato de `HttpExceptionFilter`: `{ statusCode, message, error, path, timestamp }`. Las excepciones se crean sin `cause`, así el `console.error(exception)` del filtro solo imprime la excepción Nest con su mensaje fijo y su traza, sin el error original de `pg`. La traza no llega al cliente.

### Nota sobre la Req. 1.5 y la Req. 2.3

La Req. 1.5 pide que el backend arranque aunque falte `SOFTRACKER_DATABASE_URL`, y la Req. 2.3 pide que `environment.validate()` falle en producción si falta. El diseño las concilia así:

- `SoftrackerDbService` nunca lee la URL ni abre conexiones durante el arranque. Si la variable falta, el contenedor Nest inicia y los demás módulos funcionan (Req. 1.5).
- `environment.validate()` se ejecuta en `bootstrap()` antes de crear la app. En producción (`NODE_ENV=production`, que es el valor fijado en `docker-compose.yml`) la variable ausente detiene el arranque a propósito, igual que con `DATABASE_URL` o `JWT_SECRET` (Req. 2.3).

En la práctica, en desarrollo el backend arranca sin Softracker, y en producción la variable es obligatoria aunque Softracker pueda estar caído: en ese caso el backend arranca y `/monitoreo-software/filtros` responde 503. Si se quiere que producción también arranque sin la variable, habría que quitar la Req. 2.3; el diseño actual sigue los requisitos aprobados.

## Testing Strategy

Se usan dos tipos de prueba complementarios: pruebas de ejemplo (unitarias y E2E) para casos concretos, integración con guards y errores puntuales; y pruebas basadas en propiedades para la lógica pura y la caché, donde la variación de entradas encuentra casos que los ejemplos no cubren.

### Herramientas

- Jest 30 con `ts-jest` (configuración existente): `npm test` para `src/**/*.spec.ts` y `npm run test:e2e` para `test/*.e2e-spec.ts`.
- `fast-check` 3.23.2 como `devDependency` con versión fijada. No se implementa PBT a mano.
- Cada prueba de propiedad se ejecuta con `fc.assert(fc.property(…), { numRuns: 100 })` como mínimo (o `fc.asyncProperty` para las asíncronas).
- Cada prueba de propiedad lleva un comentario con el formato:
  `// Feature: monitoreo-software-conexion-permisos, Property {número}: {texto de la propiedad}`
- Cada propiedad de la sección anterior se implementa con una sola prueba de propiedad.

### Pruebas de propiedades

| Propiedad | Archivo | Generadores principales |
| --- | --- | --- |
| 1 | `softracker-db.errors.spec.ts` | Códigos del conjunto y fuera de él (`fc.constantFrom` + `fc.string`), SQLSTATE aleatorios de 5 caracteres con y sin prefijo `08`, mensajes con los textos conocidos rodeados de texto aleatorio, envolturas `cause`/`AggregateError` de profundidad 0–3, valores no objeto. El oráculo es un modelo de referencia escrito en la prueba. |
| 2 | `softracker-db.service.spec.ts` | URLs `postgresql://usuario:clave@host:puerto/base` generadas; errores con mensaje que incrusta la URL, el `sql` o los `params`; `Logger` espiado. |
| 3 | `softracker-db.service.spec.ts` | `fc.string()` para `sql`, `fc.array(fc.jsonValue())` para `params` (y `undefined`), `fc.array(fc.object())` para filas. |
| 4 | `softracker-db.service.spec.ts` | `fc.nat({ max: 20 })` para `n`. |
| 5 | `softracker-db.service.spec.ts` | `fc.option(fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')))`, `n` en 1–5. |
| 6 | `src/config/validate-docker-env.spec.ts` (importa el `.cjs`; ver nota) | Variantes de `CHANGE_ME` con capitalización aleatoria, cadenas de espacios, URLs con protocolos aleatorios, cadenas no URL, URLs `postgres:`/`postgresql:` válidas. |
| 7 | `filtros.mapper.spec.ts` | `fc.array(fc.record({ sala_codigo: fc.option(fc.oneof(fc.string(), fc.constantFrom('', '  ', '306', '412'))) }))` y equivalente para `categoria`, con duplicados forzados. |
| 8 | `filtros.mapper.spec.ts` | Filas con `id` y `nombre` tomados de alfabetos pequeños para forzar repeticiones. |
| 9 | `monitoreo-software.service.spec.ts` | Secuencias de deltas de tiempo que incluyen `0`, `3_599_999`, `3_600_000` y valores mayores; por ronda, éxito o índice de consulta fallida (0–2) y tipo de error (503/500). Reloj inyectado vía `RELOJ_MONITOREO`; `SoftrackerDbService` simulado que cuenta invocaciones. |
| 10 | `monitoreo-software.service.spec.ts` | `n` en 2–10; consultas simuladas que quedan pendientes hasta que la prueba las resuelve o rechaza. |

Sobre la Propiedad 6: el `rootDir` de Jest es `src` y el script vive en `scripts/`. La prueba se ubica en `src/config/validate-docker-env.spec.ts` y hace `require('../../scripts/validate-docker-env.cjs')`. Para que el `require` no ejecute la validación ni `process.exit`, el script envuelve su ejecución en `if (require.main === module)`.

### Pruebas de ejemplo (unitarias)

- `softracker-db.service.spec.ts`:
  - `construirConfigPool` devuelve `max: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`, `statement_timeout: 10000`, `application_name: 'gestion-aulas'` y `options: '-c default_transaction_read_only=on'` (Req. 1.2, 1.11).
  - Se registra un listener `error` en el pool creado.
  - `onModuleDestroy`: sin pool no hace nada; con pool llama a `end()`; si `end()` rechaza, no lanza y registra (Req. 1.10).
  - Caso explícito de `25006` → `InternalServerErrorException` y de `timeout exceeded when trying to connect` → `ServiceUnavailableException` (Req. 1.11, 1.12, 6.4).
- `monitoreo-software.service.spec.ts`:
  - Las tres sentencias emitidas empiezan por `SELECT`, solo nombran `resumen_diario_uso` o `software_catalogo` y se envían con `[]`, `['ACTIVO']` y `['ACTIVO']` (Req. 4.8, 4.9).
  - Vistas vacías → `{ aulas: [], software: [], categorias: [], generadoEn }` (Req. 4.15).
  - Segunda solicitud con entrada vigente: misma respuesta y 3 invocaciones totales (Req. 6.5).
- `src/config/environment.spec.ts`: casos (a)–(d) de la Req. 2.5, más solo espacios en producción.
- `src/auth/auth.constants.spec.ts` (o un caso en una prueba existente): `MODULOS.MONITOREO_SOFTWARE === 'MONITOREO_SOFTWARE'` (Req. 3.1).

### Pruebas E2E (`backend/test/monitoreo-software.e2e-spec.ts`)

Montaje, siguiendo `test/auth.e2e-spec.ts`:

- `Test.createTestingModule({ imports: [AuthModule], controllers: [MonitoreoSoftwareController], providers: [MonitoreoSoftwareService, { provide: RELOJ_MONITOREO, useValue: () => ahora }, { provide: SoftrackerDbService, useValue: { consultar: jest.fn() } }] })`, con `.overrideProvider(PrismaService).useValue(prisma)`.
- `process.env.AUTH_TOKEN_SECRET` de prueba, `AUTH_REQUIRED=true` y `PERMISSIONS_MODE=strict`.
- Tokens firmados con `moduleFixture.get(AuthTokenService).sign(…)`; `prisma.usuario.findUnique` devuelve un usuario cuyos permisos se ajustan por caso.
- `configureApp(app)` para aplicar `HttpExceptionFilter` y `ValidationPipe`.
- Como la caché vive en la instancia del servicio, se crea la app en `beforeEach` (o se avanza el reloj simulado más allá del TTL) para aislar los casos.

Casos:

| Caso | Usuario | Esperado | Req. |
| --- | --- | --- | --- |
| Autorizado | Permisos `MONITOREO_SOFTWARE_LEER` (módulo activo) | 200, cuerpo con `aulas`, `software`, `categorias`, `generadoEn` | 4.3, 6.1 |
| Sin token | — | 401, `consultar` 0 veces | 4.10 |
| Sin módulo | Solo permisos de `AULAS` | 403, `consultar` 0 veces | 4.11, 6.2 |
| Módulo sin `LEER` | Solo `MONITOREO_SOFTWARE_EXPORTAR` | 403, `consultar` 0 veces | 4.12, 6.9 |
| Rechazo y luego autorizado | 403 seguido de 200 | La solicitud autorizada ejecuta 3 consultas (el rechazo no creó entrada) | 5.6 |
| Softracker caído | Autorizado; `consultar` lanza `ServiceUnavailableException` | 503 con `{ statusCode: 503, message, error, path, timestamp }`, sin `aulas` en el cuerpo y sin texto SQL ni host | 4.13, 6.3 |

### Integración y verificación manual

- Migración: en una base de prueba, aplicar `prisma migrate deploy` y verificar con SQL: un módulo activo con el nombre esperado, dos permisos con sus descripciones y asignaciones al administrador. Repetir el SQL de la migración para comprobar idempotencia; probar con el módulo previamente inactivo y con nombre distinto, y en una base sin rol `ADMINISTRADOR` (Req. 3.4–3.9).
- Seed: ejecutar `npm run prisma:seed` en base de desarrollo y consultar los permisos con prefijo `MONITOREO_SOFTWARE_` (Req. 3.2, 3.3).
- Preflight: ejecutar `node scripts/validate-docker-env.cjs --env-file <temporal>` con varios errores simultáneos y verificar que se listan todos y el código de salida es 1 (Req. 2.9).
- Conexión real (opcional, con Softracker disponible): `GET /monitoreo-software/filtros` devuelve datos reales; una sentencia `INSERT` emitida a través de `consultar` en una prueba manual es rechazada con `25006` (Req. 1.11).
- Arranque sin la variable con `NODE_ENV=development`: el backend inicia y otra ruta (por ejemplo `/health`) responde igual que antes (Req. 1.5).
- `npm run build`, `npm run lint`, `npm test` y `npm run test:e2e` sin errores.
