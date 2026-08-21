import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type HttpExceptionPayload = {
  error?: string;
  message?: string | string[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = this.getStatus(exception);
    const payload = this.getPayload(exception);

    response.status(status).json({
      statusCode: status,
      message: payload.message,
      error: payload.error,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    if (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      exception.code === 'P2002'
    ) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getPayload(exception: unknown): Required<HttpExceptionPayload> {
    if (!(exception instanceof HttpException)) {
      if (
        typeof exception === 'object' &&
        exception !== null &&
        'code' in exception &&
        exception.code === 'P2002'
      ) {
        return {
          message: 'Ya existe un recurso con esos datos únicos.',
          error: 'Conflict',
        };
      }
      return {
        message: 'Error interno del servidor.',
        error: 'Internal Server Error',
      };
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return { message: response, error: exception.name };
    }

    const payload = response as HttpExceptionPayload;
    return {
      message: payload.message ?? exception.message,
      error: payload.error ?? exception.name,
    };
  }
}
