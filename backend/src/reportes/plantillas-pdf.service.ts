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

/** Envía los datos al renderizador FastAPI que rellena XLSX y devuelve PDF. */
@Injectable()
export class PlantillasPdfService {
  async generar(
    plantilla: PlantillaPdf,
    valores: Record<string, string>,
    nombreArchivo: string,
  ): Promise<Buffer> {
    const baseUrl = process.env.PDF_RENDERER_URL?.trim() || 'http://127.0.0.1:8001';
    const timeout = Number(process.env.PDF_RENDERER_TIMEOUT_MS ?? 120000);
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
        const detail = await response.text().catch(() => '');
        throw new Error(`Renderizador PDF respondió ${response.status}: ${detail.slice(0, 500)}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `No fue posible generar el PDF mediante el renderizador XLSX: ${detail}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
