import {
  ArgumentsHost,
  Catch,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@Catch()
export class DocumentalExceptionFilter extends HttpExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const conflicto =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002';
    if (
      (error instanceof HttpException && error.getStatus() < 500) ||
      conflicto
    ) {
      super.catch(error, host);
      return;
    }
    // Prisma y los parsers pueden incluir argumentos o fragmentos del PDF en
    // sus excepciones. El filtro compartido registra los errores 500: pasarle
    // únicamente una excepción segura, sin adjuntar causa ni datos personales.
    super.catch(
      new InternalServerErrorException(
        'No fue posible completar la operación documental.',
      ),
      host,
    );
  }
}
