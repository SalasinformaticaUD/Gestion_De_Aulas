import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { CredencialesCifradoService } from './credenciales-cifrado.service';
import { CreateCredencialeDto } from './dto/create-credenciale.dto';
import {
  CambiarEstadoCredencialDto,
  CrearAccesoCredencialDto,
  FindCredencialesDto,
  GuardarSecretoCredencialDto,
} from './dto/credenciales.dto';
import { AuthService } from '../auth/auth.service';
import { UpdateCredencialeDto } from './dto/update-credenciale.dto';

const include = {
  accesos: {
    include: {
      usuario: {
        select: { id: true, nombreCompleto: true, nombreUsuario: true },
      },
    },
  },
  creador: { select: { id: true, nombreCompleto: true, nombreUsuario: true } },
} as const;
type CredencialConAccesos = Prisma.CredencialOperativaGetPayload<{
  include: typeof include;
}>;
@Injectable()
export class CredencialesService {
  private readonly desbloqueos = new Map<string, number>();
  constructor(
    private prisma: PrismaService,
    private cifrado: CredencialesCifradoService,
    private auditoria: AuditoriaService,
    private auth: AuthService,
  ) {}
  async create(dto: CreateCredencialeDto, usuarioId: string) {
    await this.validarAccesos(dto.accesos ?? []);
    const credencial = await this.prisma.credencialOperativa.create({
      data: {
        creadorId: usuarioId,
        nombre: dto.nombre.trim(),
        usuario: dto.usuario?.trim(),
        secretoCifrado: dto.secreto ? this.cifrado.cifrar(dto.secreto) : null,
        descripcion: dto.descripcion?.trim(),
        estado: dto.estado,
        accesos: {
          create: [
            { usuarioId, puedeVer: true, puedeEditar: true },
            ...(dto.accesos ?? [])
              .filter((acceso) => acceso.usuarioId !== usuarioId)
              .map((acceso) => ({ usuarioId: acceso.usuarioId, puedeVer: acceso.puedeVer ?? true, puedeEditar: acceso.puedeEditar ?? false })),
          ],
        },
      },
      include,
    });
    await this.audit(usuarioId, credencial.id, 'CREATE', undefined, credencial);
    return this.publica(credencial);
  }
  async findAll(dto: FindCredencialesDto, usuarioId: string) {
    const administrador = await this.esAdministrador(usuarioId);
    const where: Prisma.CredencialOperativaWhereInput = {
      AND: [
        ...(administrador
          ? []
          : [{ accesos: { some: { usuarioId, puedeVer: true } } }]),
        ...(dto.responsableId
          ? [{ accesos: { some: { usuarioId: dto.responsableId } } }]
          : []),
      ],
      ...(dto.nombre && {
        nombre: { contains: dto.nombre, mode: 'insensitive' },
      }),
      ...(dto.estado && { estado: dto.estado }),
    };
    return (
      (await this.prisma.credencialOperativa.findMany({
        where,
        include,
        orderBy: { nombre: 'asc' },
      })) as CredencialConAccesos[]
    ).map((item) => this.publica(item));
  }
  listarUsuariosAutorizables() {
    return this.prisma.usuario.findMany({
      where: { estado: 'ACTIVA' },
      select: { id: true, nombreCompleto: true, nombreUsuario: true, correo: true },
      orderBy: { nombreCompleto: 'asc' },
    });
  }
  async findOne(id: string, usuarioId: string) {
    return this.publica(await this.access(id, usuarioId));
  }
  async update(id: string, dto: UpdateCredencialeDto, usuarioId: string) {
    const previo = await this.access(id, usuarioId, true);
    const actualizado = await this.prisma.credencialOperativa.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.usuario !== undefined && { usuario: dto.usuario.trim() }),
        ...(dto.descripcion !== undefined && {
          descripcion: dto.descripcion.trim(),
        }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
      },
      include,
    });
    await this.audit(usuarioId, id, 'UPDATE', previo, {
      ...actualizado,
      motivoCambio: dto.motivoCambio,
    });
    return this.publica(actualizado);
  }
  async cambiarEstado(
    id: string,
    dto: CambiarEstadoCredencialDto,
    usuarioId: string,
  ) {
    const previo = await this.access(id, usuarioId, true);
    const actual = await this.prisma.credencialOperativa.update({
      where: { id },
      data: { estado: dto.estado },
      include,
    });
    await this.audit(usuarioId, id, 'UPDATE', previo, {
      ...actual,
      motivoCambio: dto.motivoCambio,
    });
    return this.publica(actual);
  }
  async crearAcceso(
    id: string,
    dto: CrearAccesoCredencialDto,
    usuarioId: string,
  ) {
    await this.gestionarPermisos(id, usuarioId);
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
      select: { id: true },
    });
    if (!usuario)
      throw new NotFoundException('El usuario autorizado no existe.');
    const acceso = await this.prisma.accesoCredencial.upsert({
      where: {
        credencialId_usuarioId: { credencialId: id, usuarioId: dto.usuarioId },
      },
      create: {
        credencialId: id,
        usuarioId: dto.usuarioId,
        puedeVer: dto.puedeVer ?? true,
        puedeEditar: dto.puedeEditar ?? false,
      },
      update: {
        ...(dto.puedeVer !== undefined && { puedeVer: dto.puedeVer }),
        ...(dto.puedeEditar !== undefined && { puedeEditar: dto.puedeEditar }),
      },
    });
    await this.audit(usuarioId, id, 'UPDATE', undefined, {
      acceso: {
        usuarioId: dto.usuarioId,
        puedeVer: acceso.puedeVer,
        puedeEditar: acceso.puedeEditar,
      },
    });
    return acceso;
  }
  async remove(id: string, contrasenaUsuario: string, usuarioId: string) {
    await this.verificarContrasenaUsuario(usuarioId, contrasenaUsuario);
    const previo = await this.access(id, usuarioId);
    if (previo.creadorId !== usuarioId)
      throw new ForbiddenException('Solo quien creó la credencial puede eliminarla.');
    const eliminado = await this.prisma.credencialOperativa.delete({ where: { id } });
    await this.audit(usuarioId, id, 'DELETE', previo, undefined);
    return { id: eliminado.id, eliminado: true };
  }
  async cambiarSecreto(
    id: string,
    dto: GuardarSecretoCredencialDto,
    usuarioId: string,
  ) {
    await this.verificarContrasenaUsuario(usuarioId, dto.contrasenaUsuario);
    const credencial = await this.access(id, usuarioId, true);
    const propio = await this.prisma.secretoCredencial.findUnique({
      where: { credencialId_usuarioId: { credencialId: id, usuarioId } },
    });
    const secretoCifrado = propio?.secretoCifrado ?? credencial.secretoCifrado;
    if (!secretoCifrado) {
      throw new NotFoundException(
        'La credencial todavía no tiene una contraseña registrada.',
      );
    }
    if (this.cifrado.descifrar(secretoCifrado) !== dto.secretoActual) {
      throw new ForbiddenException(
        'La contraseña antigua de la credencial no es correcta.',
      );
    }
    const nuevoCifrado = this.cifrado.cifrar(dto.secretoNuevo);
    if (propio) {
      await this.prisma.secretoCredencial.update({
        where: { credencialId_usuarioId: { credencialId: id, usuarioId } },
        data: { secretoCifrado: nuevoCifrado },
      });
    } else {
      await this.prisma.credencialOperativa.update({
        where: { id },
        data: { secretoCifrado: nuevoCifrado },
      });
    }
    await this.audit(usuarioId, id, 'UPDATE', undefined, {
      secretoActualizado: true,
    });
    return { id, actualizado: true };
  }
  async verificarAcceso(usuarioId: string, contrasena: string) {
    if (!(await this.auth.verifyCurrentPassword(usuarioId, contrasena)))
      throw new ForbiddenException('La contraseña de la sesión no es válida.');
    this.desbloqueos.set(usuarioId, Date.now() + 15 * 60 * 1000);
    return { desbloqueado: true, expiraEn: this.desbloqueos.get(usuarioId) };
  }
  async revelar(id: string, usuarioId: string) {
    const credencial = await this.access(id, usuarioId);
    if ((this.desbloqueos.get(usuarioId) ?? 0) < Date.now())
      throw new ForbiddenException('El módulo está bloqueado. Vuelve a ingresar tu contraseña.');
    const propio = await this.prisma.secretoCredencial.findUnique({
      where: { credencialId_usuarioId: { credencialId: id, usuarioId } },
    });
    const cifrado = propio?.secretoCifrado ?? credencial.secretoCifrado;
    if (!cifrado) throw new NotFoundException('Aún no ha registrado una contraseña para esta credencial.');
    await this.audit(usuarioId, id, 'LOGIN', undefined, {
      consultaSecreto: true,
    });
    return { id, secreto: this.cifrado.descifrar(cifrado) };
  }
  private async access(id: string, usuarioId: string, editar = false) {
    const c = await this.prisma.credencialOperativa.findUnique({
      where: { id },
      include,
    });
    if (!c) throw new NotFoundException('La credencial no existe.');
    const administrador = await this.esAdministrador(usuarioId);
    const acceso = c.accesos.find((a) => a.usuarioId === usuarioId);
    const puedeVer = acceso?.puedeVer;
    const puedeEditar = acceso?.puedeEditar;
    if (!administrador && (!puedeVer || (editar && !puedeEditar)))
      throw new ForbiddenException('No está autorizado para esta credencial.');
    return c;
  }
  private async gestionarPermisos(id: string, usuarioId: string) {
    const credencial = await this.access(id, usuarioId);
    if (credencial.creadorId !== usuarioId && !(await this.esAdministrador(usuarioId)))
      throw new ForbiddenException('Solo quien creó la credencial puede modificar sus permisos.');
    return credencial;
  }
  private async validarAccesos(accesos: Array<{ usuarioId: string }>) {
    const usuariosIds = [...new Set(accesos.map((acceso) => acceso.usuarioId))];
    if (usuariosIds.length) {
      const usuarios = await this.prisma.usuario.findMany({ where: { id: { in: usuariosIds } }, select: { id: true } });
      if (usuarios.length !== usuariosIds.length) throw new NotFoundException('Uno o más usuarios autorizados no existen.');
    }
  }
  private async verificarContrasenaUsuario(
    usuarioId: string,
    contrasena: string,
  ) {
    if (!(await this.auth.verifyCurrentPassword(usuarioId, contrasena))) {
      throw new ForbiddenException('La contraseña de la sesión no es válida.');
    }
  }
  private async esAdministrador(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId }, select: { roles: { select: { rol: { select: { nombre: true } } } } },
    });
    return usuario?.roles.some(({ rol }) => rol.nombre.trim().toUpperCase() === 'ADMINISTRADOR') ?? false;
  }
  private publica(
    c: CredencialConAccesos,
  ): Omit<CredencialConAccesos, 'secretoCifrado'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { secretoCifrado, ...metadata } = c;
    return metadata;
  }
  private audit(
    usuarioId: string,
    id: string,
    accion: 'CREATE' | 'UPDATE' | 'LOGIN' | 'DELETE',
    previo: unknown,
    nuevo: unknown,
  ) {
    return this.auditoria.registrar({
      usuarioId,
      entidad: 'CredencialOperativa',
      entidadId: id,
      accion,
      datosPrevios: previo,
      datosNuevos: nuevo,
    });
  }
}
