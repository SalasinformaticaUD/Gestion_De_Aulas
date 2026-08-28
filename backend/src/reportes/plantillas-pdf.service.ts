import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export type PlantillaPdf =
  | 'SIGUD'
  | 'Ficha - Practicas libres'
  | 'Ficha SIGUD audiovisuales';

const ARCHIVOS: Record<PlantillaPdf, string> = {
  SIGUD: 'SIGUD.xlsx',
  'Ficha - Practicas libres': 'Ficha - Practicas libres.xlsx',
  'Ficha SIGUD audiovisuales': 'Ficha SIGUD audiovisuales.xlsx',
};

/** Envía los datos al renderizador FastAPI que rellena XLSX y devuelve el PDF. */
@Injectable()
export class PlantillasPdfService {
  async generar(
    plantilla: PlantillaPdf,
    valores: Record<string, string>,
    nombreArchivo: string,
  ): Promise<Buffer> {
    const baseUrl =
      process.env.PDF_RENDERER_URL?.trim() || 'http://127.0.0.1:8001';
    const timeout = this.timeout();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/render/xlsx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantilla: ARCHIVOS[plantilla],
          valores,
          nombreArchivo,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detalle = await response.text().catch(() => '');
        throw new Error(
          `El renderizador PDF respondió ${response.status}: ${detalle.slice(0, 500)}`,
        );
      }

      const contenido = Buffer.from(await response.arrayBuffer());
      if (contenido.length === 0) {
        throw new Error('El renderizador PDF devolvió una respuesta vacía.');
      }
      return contenido;
    } catch (error: unknown) {
      const detalle = this.detalleError(error, timeout);
      throw new ServiceUnavailableException(
        `No fue posible generar el PDF mediante el renderizador XLSX: ${detalle}`,
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private timeout(): number {
    const configurado = Number(process.env.PDF_RENDERER_TIMEOUT_MS ?? 120000);
    return Number.isFinite(configurado) && configurado > 0
      ? configurado
      : 120000;
  }

  private detalleError(error: unknown, timeout: number): string {
    if (error instanceof Error && error.name === 'AbortError') {
      return `tiempo de espera agotado después de ${timeout} ms`;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
