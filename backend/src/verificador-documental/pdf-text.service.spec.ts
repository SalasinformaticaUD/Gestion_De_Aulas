import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PdfTextService } from './pdf-text.service';
import { DocumentClassificationService } from './document-classification.service';
import { TEXTOS_DOCUMENTOS } from './document-classification.fixtures';
import { DOCUMENTOS_REQUERIDOS } from './verificador-documental.constants';

describe('Extracción real de texto PDF.js', () => {
  it('extrae y clasifica las ocho páginas de un PDF real sin IA', async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (const texto of TEXTOS_DOCUMENTOS) {
      const page = pdf.addPage();
      page.drawText(texto, { x: 20, y: 700, size: 9, font, maxWidth: 540 });
    }
    const bytes = Buffer.from(await pdf.save());
    const servicio = new PdfTextService();
    const paginas = await servicio.extraer(bytes, 8);
    expect(paginas).toHaveLength(8);
    expect(paginas.every((p) => p.texto.length > 40 && !p.error)).toBe(true);
    const resultado = new DocumentClassificationService(
      servicio,
    ).clasificarTextos([{ nombreOriginal: 'anonimo.pdf', paginas }]);
    expect(resultado.documentos.map((d) => d.tipo)).toEqual(
      DOCUMENTOS_REQUERIDOS.map((d) => d.tipo),
    );
  }, 20000);
  it('devuelve páginas sin texto cuando no hay capa textual', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const paginas = await new PdfTextService().extraer(
      Buffer.from(await pdf.save()),
      1,
    );
    expect(paginas).toEqual([{ pagina: 1, texto: '' }]);
  }, 20000);
  it('señala extracción incompleta sin bloquear todo el envío', async () => {
    expect(
      await new PdfTextService().extraer(Buffer.from('pdf no legible'), 2),
    ).toEqual([
      { pagina: 1, texto: '', error: true },
      { pagina: 2, texto: '', error: true },
    ]);
  }, 20000);
  it('un PDF de imágenes no se hace pasar por OCR ejecutado', async () => {
    const pdf = await PDFDocument.create();
    const png = await pdf.embedPng(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9AAAAABJRU5ErkJggg==',
        'base64',
      ),
    );
    pdf.addPage().drawImage(png, { x: 20, y: 200, width: 300, height: 300 });
    const service = new PdfTextService();
    const paginas = await service.extraer(Buffer.from(await pdf.save()), 1);
    expect(paginas).toEqual([{ pagina: 1, texto: '' }]);
    const r = new DocumentClassificationService(service).clasificarTextos([
      { nombreOriginal: 'escaneado.pdf', paginas },
    ]);
    expect(r.documentos[0]).toMatchObject({
      estadoClasificacion: 'SIN_TEXTO',
      requiereOcr: true,
      requiereRevisionManual: true,
      tipo: 'NO_RECONOCIDO',
    });
    expect(r.hallazgos.some((h) => h.codigo === 'PAGINA_SIN_TEXTO')).toBe(true);
    expect(
      r.hallazgos.filter((h) => h.codigo === 'DOCUMENTO_FALTANTE'),
    ).toHaveLength(8);
  }, 20000);
});
