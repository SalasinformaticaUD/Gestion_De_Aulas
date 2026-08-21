import { EstadoCuenta } from '../../generated/prisma/enums.js';
import { PasswordHashService } from '../auth/password-hash.service';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  const prisma = {
    usuario: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const passwords = new PasswordHashService();
  const service = new UsuariosService(prisma as never, passwords);

  beforeEach(() => jest.clearAllMocks());

  it('guarda un hash y solicita una selección que no incluye passwordHash', async () => {
    prisma.usuario.create.mockResolvedValue({
      id: 'usuario-id',
      nombreUsuario: 'operador',
    });

    await service.create({
      nombreCompleto: 'Operador de pruebas',
      nombreUsuario: 'operador',
      correo: 'operador@example.test',
      password: 'Clave-segura-2026',
    });

    const createCalls = prisma.usuario.create.mock.calls as Array<
      [CreateUsuarioCall]
    >;
    const argument = createCalls[0][0];
    expect(
      passwords.verify('Clave-segura-2026', argument.data.passwordHash),
    ).toBe(true);
    expect(argument.select).not.toHaveProperty('passwordHash');
  });

  it('desactiva un usuario en lugar de eliminarlo', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'usuario-id' });
    prisma.usuario.update.mockResolvedValue({
      id: 'usuario-id',
      estado: EstadoCuenta.INACTIVA,
    });

    await service.remove('usuario-id');

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: EstadoCuenta.INACTIVA } }),
    );
  });
});

type CreateUsuarioCall = {
  data: { passwordHash: string };
  select: Record<string, unknown>;
};
