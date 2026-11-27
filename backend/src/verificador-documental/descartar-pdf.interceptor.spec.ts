import type { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, Subject, throwError } from 'rxjs';
import { DescartarPdfInterceptor } from './descartar-pdf.interceptor';

describe('Descarte de PDF tras la petición', () => {
  function entrada() {
    const buffer = Buffer.from('original de prueba');
    const file = {
      buffer,
      size: buffer.length,
      originalname: 'prueba.pdf',
      mimetype: 'application/pdf',
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ files: [file] }) }),
    } as unknown as ExecutionContext;
    return { file, buffer, context };
  }
  it('descarta el contenido después de una respuesta correcta', async () => {
    const { file, buffer, context } = entrada();
    expect(
      await lastValueFrom(
        new DescartarPdfInterceptor().intercept(context, {
          handle: () => of('resultado'),
        }),
      ),
    ).toBe('resultado');
    expect(file.buffer.length).toBe(0);
    expect(buffer.every((b) => b === 0)).toBe(true);
  });
  it('descarta el contenido si falla una validación previa al controlador', async () => {
    const { file, buffer, context } = entrada();
    await expect(
      lastValueFrom(
        new DescartarPdfInterceptor().intercept(context, {
          handle: () => throwError(() => new Error('UUID inválido')),
        }),
      ),
    ).rejects.toThrow('UUID inválido');
    expect(file.size).toBe(0);
    expect(buffer.every((b) => b === 0)).toBe(true);
  });
  it('descarta el contenido al cancelar la suscripción', () => {
    const { file, context } = entrada();
    const source = new Subject();
    const subscription = new DescartarPdfInterceptor()
      .intercept(context, { handle: () => source })
      .subscribe();
    subscription.unsubscribe();
    expect(file.buffer.length).toBe(0);
  });
});
