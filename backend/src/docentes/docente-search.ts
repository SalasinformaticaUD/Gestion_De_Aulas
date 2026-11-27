import { Prisma } from '@prisma/client';

export function normalizarBusquedaDocente(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function patron(value: string): string {
  return `%${normalizarBusquedaDocente(value).replace(/[\\%_]/g, '\\$&')}%`;
}

// Each name fragment can occur anywhere, including when surnames are entered first.
export function filtroNombreDocente(query: string): Prisma.Sql {
  const partes = query.trim().split(/\s+/).filter(Boolean);
  return Prisma.join(
    partes.map(
      (parte) => Prisma.sql`
    public.normalizar_busqueda_docente("nombre") LIKE ${patron(parte)}
  `,
    ),
    ' AND ',
  );
}

export function filtroBusquedaDocente(query: string): Prisma.Sql {
  const pattern = patron(query);
  return Prisma.sql`((${filtroNombreDocente(query)})
    OR public.normalizar_busqueda_docente("documento") LIKE ${pattern}
    OR public.normalizar_busqueda_docente("correo") LIKE ${pattern}
    OR public.normalizar_busqueda_docente("proyecto") LIKE ${pattern})`;
}
