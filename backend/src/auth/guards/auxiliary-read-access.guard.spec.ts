import { ForbiddenException } from '@nestjs/common';
import { type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { ModulePermissionsGuard } from './module-permissions.guard';
import { PermissionsGuard } from './permissions.guard';

const contextFor = (user: { modulos: string[]; permisos: string[] }) => ({
  getHandler: () => undefined,
  getClass: () => undefined,
  switchToHttp: () => ({ getRequest: () => ({ user }) }),
}) as unknown as ExecutionContext;

describe('lectura auxiliar entre módulos operativos', () => {
  const previousMode = process.env.PERMISSIONS_MODE;

  afterEach(() => { process.env.PERMISSIONS_MODE = previousMode; });

  it('permite a Prácticas Libres consultar el catálogo de software en modo estricto', () => {
    process.env.PERMISSIONS_MODE = 'strict';
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue('SOFTWARE') } as any;
    const guard = new ModulePermissionsGuard(reflector);

    expect(guard.canActivate(contextFor({ modulos: ['PRACTICAS_LIBRES'], permisos: ['PRACTICAS_LIBRES_LEER'] }))).toBe(true);
  });

  it('concede solo SOFTWARE_LEER auxiliar y no SOFTWARE_CREAR', () => {
    process.env.PERMISSIONS_MODE = 'strict';
    const user = { modulos: ['PRACTICAS_LIBRES'], permisos: ['PRACTICAS_LIBRES_LEER'] };
    const readGuard = new PermissionsGuard({ getAllAndOverride: jest.fn().mockReturnValue(['SOFTWARE_LEER']) } as any);
    const createGuard = new PermissionsGuard({ getAllAndOverride: jest.fn().mockReturnValue(['SOFTWARE_CREAR']) } as any);

    expect(readGuard.canActivate(contextFor(user))).toBe(true);
    expect(() => createGuard.canActivate(contextFor(user))).toThrow(ForbiddenException);
  });
});
