import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PasswordHashService } from '../auth/password-hash.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvisionMonitorUserDto } from './dto/provision-monitor-user.dto';

@Injectable()
export class MonitoresProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHashService,
  ) {}

  async provision(dto: ProvisionMonitorUserDto) {
    const existing = await this.prisma.usuario.findMany({
      where: {
        OR: [
          { nombreUsuario: dto.nombreUsuario },
          { correo: dto.correo },
        ],
      },
      select: { id: true, nombreUsuario: true, correo: true, estado: true },
    });
    if (existing.length > 1) {
      throw new ConflictException(
        'El nombre de usuario y el correo pertenecen a usuarios distintos.',
      );
    }
    if (existing.length === 1) {
      return { id: existing[0].id, creado: false, estado: existing[0].estado };
    }

    const user = await this.prisma.usuario.create({
      data: {
        nombreCompleto: dto.nombreCompleto,
        nombreUsuario: dto.nombreUsuario,
        correo: dto.correo,
        dependenciaId: dto.dependenciaId,
        // La cuenta queda inactiva hasta que Aulas le asigne contraseña y permisos.
        estado: 'INACTIVA',
        passwordHash: this.passwords.hash(randomUUID()),
      },
      select: { id: true, estado: true },
    });
    return { id: user.id, creado: true, estado: user.estado };
  }
}
