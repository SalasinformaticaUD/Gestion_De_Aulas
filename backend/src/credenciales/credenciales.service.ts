import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { CredencialesCifradoService } from './credenciales-cifrado.service';
import { CreateCredencialeDto } from './dto/create-credenciale.dto';
import {
  CambiarEstadoCredencialDto,
  CrearAccesoCredencialDto,
  FindCredencialesDto,
} from './dto/credenciales.dto';
import { UpdateCredencialeDto } from './dto/update-credenciale.dto';

const include = {
  accesos: {
    include: {
      usuario: {
        select: { id: true, nombreCompleto: true, nombreUsuario: true },
      },
    },
  },
} as const;
type CredencialConAccesos = Prisma.CredencialOperativaGetPayload<{
  include: typeof include;
}>;
@Injectable()
export class CredencialesService {
  constructor(
    private prisma: PrismaService,
    private cifrado: CredencialesCifradoService,
    private auditoria: AuditoriaService,
  ) {}
  async create(dto: CreateCredencialeDto, usuarioId: string) {
    const credencial = await this.prisma.credencialOperativa.create({
      data: {
        nombre: dto.nombre.trim(),
        categoria: dto.categoria.trim(),
        usuario: dto.usuario?.trim(),
        secretoCifrado: this.cifrado.cifrar(dto.secreto),
        descripcion: dto.descripcion?.trim(),
        estado: dto.estado,
        accesos: { create: { usuarioId, puedeVer: true, puedeEditar: true } },
      },
      include,
    });
    await this.audit(usuarioId, credencial.id, 'CREATE', undefined, credencial);
    return this.publica(credencial);
  }
  async findAll(dto: FindCredencialesDto, usuarioId: string) {
    const where: Prisma.CredencialOperativaWhereInput = {
      AND: [
        { accesos: { some: { usuarioId, puedeVer: true } } },
        ...(dto.responsableId
          ? [{ accesos: { some: { usuarioId: dto.responsableId } } }]
          : []),
      ],
      ...(dto.nombre && {
        nombre: { contains: dto.nombre, mode: 'insensitive' },
      }),
      ...(dto.categoria && {
        categoria: { contains: dto.categoria, mode: 'insensitive' },
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
  async findOne(id: string, usuarioId: string) {
    return this.publica(await this.access(id, usuarioId));
  }
  async update(id: string, dto: UpdateCredencialeDto, usuarioId: string) {
    const previo = await this.access(id, usuarioId, true);
    const actualizado = await this.prisma.credencialOperativa.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.categoria !== undefined && { categoria: dto.categoria.trim() }),
        ...(dto.usuario !== undefined && { usuario: dto.usuario.trim() }),
        ...(dto.descripcion !== undefined && {
          descripcion: dto.descripcion.trim(),
        }),
        ...(dto.secreto !== undefined && {
          secretoCifrado: this.cifrado.cifrar(dto.secreto),
        }),
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
    await this.access(id, usuarioId, true);
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
  async revelar(id: string, usuarioId: string) {
    const credencial = await this.access(id, usuarioId);
    await this.audit(usuarioId, id, 'LOGIN', undefined, {
      consultaSecreto: true,
    });
    return { id, secreto: this.cifrado.descifrar(credencial.secretoCifrado) };
  }
  private async access(id: string, usuarioId: string, editar = false) {
    const c = await this.prisma.credencialOperativa.findUnique({
      where: { id },
      include,
    });
    if (!c) throw new NotFoundException('La credencial no existe.');
    const acceso = c.accesos.find((a) => a.usuarioId === usuarioId);
    if (!acceso || !acceso.puedeVer || (editar && !acceso.puedeEditar))
      throw new ForbiddenException('No está autorizado para esta credencial.');
    return c;
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
    accion: 'CREATE' | 'UPDATE' | 'LOGIN',
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
