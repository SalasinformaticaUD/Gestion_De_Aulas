import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { UsuarioAutenticado } from '../../src/auth/auth.types';

export const testAdministrator: UsuarioAutenticado = {
  id: '00000000-0000-4000-8000-000000000099',
  nombreCompleto: 'Administrador de pruebas',
  nombreUsuario: 'admin-e2e',
  correo: 'admin-e2e@example.test',
  cargo: null,
  dependencia: null,
  roles: ['ADMINISTRADOR'],
  permisos: [
    'ADMINISTRACION_CREAR',
    'ADMINISTRACION_LEER',
    'ADMINISTRACION_ACTUALIZAR',
    'ADMINISTRACION_ELIMINAR',
    'HORARIOS_CREAR',
    'HORARIOS_LEER',
    'HORARIOS_ACTUALIZAR',
    'HORARIOS_ELIMINAR',
  ],
  modulos: ['ADMINISTRACION', 'AULAS', 'HORARIOS'],
};

export function attachTestAdministrator(app: INestApplication): void {
  app.use((request: Request, _response: Response, next: NextFunction) => {
    (request as Request & { user?: UsuarioAutenticado }).user =
      testAdministrator;
    next();
  });
}
