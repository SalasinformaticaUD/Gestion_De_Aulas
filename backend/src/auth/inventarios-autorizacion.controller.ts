import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { MODULOS, MODULOS_CON_LECTURA_AUXILIAR } from './auth.constants';
import { Public } from './decorators/public.decorator';
import { InventariosServiceTokenGuard } from './guards/inventarios-service-token.guard';

@Public()
@UseGuards(InventariosServiceTokenGuard)
@Controller('integraciones/inventarios')
export class InventariosAutorizacionController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('usuarios/:id/autorizacion')
  @Header('Cache-Control', 'no-store')
  async consultar(@Param('id', ParseUUIDPipe) id: string) {
    const usuario = await this.auth.findAuthenticatedUser(id);
    if (!usuario)
      throw new ForbiddenException('Usuario inactivo o inexistente.');
    const modulos = new Set(
      usuario.modulos.map((modulo) => modulo.toUpperCase()),
    );
    const permisos = new Set(
      usuario.permisos.map((permiso) => permiso.toUpperCase()),
    );
    const lecturaAuxiliar = (
      MODULOS_CON_LECTURA_AUXILIAR[MODULOS.AULAS] ?? []
    ).some((modulo) => modulos.has(modulo));
    const puedeLeerAulas =
      lecturaAuxiliar ||
      (modulos.has(MODULOS.AULAS) && permisos.has('AULAS_LEER'));
    const aulas = puedeLeerAulas
      ? await this.prisma.aula.findMany({
          where: { responsableId: usuario.id, eliminadoEn: null },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      : [];
    return {
      id: usuario.id,
      permisos: usuario.permisos,
      roles: usuario.roles,
      aulas: aulas.map((aula) => aula.id),
    };
  }
}
