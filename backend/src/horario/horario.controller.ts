import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FindClasesDto } from './dto/find-clases.dto';
import { UpdateClaseProgramadaDto } from './dto/update-clase-programada.dto';
import { UpdatePeriodoAcademicoDto } from './dto/update-periodo-academico.dto';
import { ImportarHorarioExcelDto } from './dto/importar-horario-excel.dto';
import { IniciarSemestreDto } from './dto/iniciar-semestre.dto';
import { HorarioService } from './horario.service';
import { AuthService } from '../auth/auth.service';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireModule(MODULOS.HORARIOS)
@Controller('horario')
export class HorarioController {
  constructor(
    private readonly horarioService: HorarioService,
    private readonly authService: AuthService,
  ) {}

  @Get('periodos')
  @RequirePermissions('HORARIOS_LEER')
  findPeriodos() {
    return this.horarioService.findPeriodos();
  }

  @Post('periodos/iniciar-semestre')
  @RequirePermissions('HORARIOS_CREAR')
  async iniciarSemestre(
    @Body() dto: IniciarSemestreDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    this.ensureAdministrator(usuario);
    if (
      !usuario ||
      !(await this.authService.verifyCurrentPassword(
        usuario.id,
        dto.passwordConfirmacion,
      ))
    ) {
      throw new UnauthorizedException('La contraseña de confirmación es incorrecta.');
    }
    const { passwordConfirmacion: _passwordConfirmacion, ...periodo } = dto;
    return this.horarioService.createPeriodo({ ...periodo, activo: true }, usuario.id);
  }

  @Get('periodos/:id')
  @RequirePermissions('HORARIOS_LEER')
  findPeriodo(@Param('id', ParseUUIDPipe) id: string) {
    return this.horarioService.findPeriodo(id);
  }

  @Patch('periodos/:id/activar')
  @RequirePermissions('HORARIOS_ACTUALIZAR')
  activarPeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.activarPeriodo(id, usuario?.id);
  }

  @Patch('periodos/:id')
  @RequirePermissions('HORARIOS_ACTUALIZAR')
  updatePeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePeriodoAcademicoDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.updatePeriodo(id, dto, usuario?.id);
  }

  @Delete('periodos/:id')
  @RequirePermissions('HORARIOS_ELIMINAR')
  removePeriodo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.removePeriodo(id, usuario?.id);
  }

  @Get('clases')
  @RequirePermissions('HORARIOS_LEER')
  findClases(@Query() filters: FindClasesDto) {
    return this.horarioService.findClases(filters);
  }

  @Post('importar/excel')
  @RequirePermissions('HORARIOS_CREAR')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 20_000_000 } }),
  )
  importarExcel(
    @UploadedFile()
    archivo:
      { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Body() dto: ImportarHorarioExcelDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    this.ensureAdministrator(usuario);
    return this.horarioService.importarExcelOficial(archivo, dto);
  }

  private ensureAdministrator(usuario?: UsuarioAutenticado): void {
    if (!usuario?.roles.some((rol) => rol.toUpperCase() === 'ADMINISTRADOR')) {
      throw new ForbiddenException(
        'Solo un administrador puede administrar el horario.',
      );
    }
  }

  @Patch('clases/:id')
  @RequirePermissions('HORARIOS_ACTUALIZAR')
  updateClase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClaseProgramadaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.updateClase(id, dto, usuario?.id);
  }

  @Delete('clases/:id')
  @RequirePermissions('HORARIOS_ELIMINAR')
  removeClase(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.horarioService.removeClase(id, usuario?.id);
  }
}
