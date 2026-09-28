import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

const contexto = (permisos: string[]) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { permisos, modulos: ['SOLICITUDES_INSTALACION'] },
      }),
    }),
  }) as unknown as ExecutionContext;

const guardia = (permiso: string) =>
  new PermissionsGuard({
    getAllAndOverride: jest.fn().mockReturnValue([permiso]),
  } as never);

describe('perfiles de solicitudes de instalación', () => {
  const modoAnterior = process.env.PERMISSIONS_MODE;

  beforeEach(() => {
    process.env.PERMISSIONS_MODE = 'strict';
  });

  afterAll(() => {
    process.env.PERMISSIONS_MODE = modoAnterior;
  });

  it('permite lectura al perfil consultor y bloquea aprobación', () => {
    const usuario = contexto(['SOLICITUDES_INSTALACION_LEER']);
    expect(guardia('SOLICITUDES_INSTALACION_LEER').canActivate(usuario)).toBe(
      true,
    );
    expect(() =>
      guardia('SOLICITUDES_INSTALACION_APROBAR').canActivate(usuario),
    ).toThrow(ForbiddenException);
  });

  it('permite aprobar y exportar al perfil gestor autorizado', () => {
    const usuario = contexto([
      'SOLICITUDES_INSTALACION_LEER',
      'SOLICITUDES_INSTALACION_APROBAR',
      'SOLICITUDES_INSTALACION_EXPORTAR',
    ]);
    expect(
      guardia('SOLICITUDES_INSTALACION_APROBAR').canActivate(usuario),
    ).toBe(true);
    expect(
      guardia('SOLICITUDES_INSTALACION_EXPORTAR').canActivate(usuario),
    ).toBe(true);
  });
});
