import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MODULOS } from '../auth/auth.constants';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { EstudiantesService } from './estudiantes.service';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { UpdateEstudianteDto } from './dto/update-estudiante.dto';

@RequireAuth()
@RequireModule(MODULOS.ESTUDIANTES)
@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly service: EstudiantesService) {}

  @Post() @RequirePermissions('ESTUDIANTES_CREAR')
  create(@Body() dto: CreateEstudianteDto, @CurrentUser() user?: UsuarioAutenticado) { return this.service.create(dto, user?.id); }

  @Post('importar/excel') @RequirePermissions('ESTUDIANTES_CREAR')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 20_000_000 } }))
  importarExcel(@UploadedFile() archivo: { buffer: Buffer; originalname: string } | undefined, @CurrentUser() user?: UsuarioAutenticado) { return this.service.importarExcel(archivo, user?.id); }

  @Get() @RequirePermissions('ESTUDIANTES_LEER')
  findAll(@Query('q') q?: string) { return this.service.findAll(q); }

  @Get(':id') @RequirePermissions('ESTUDIANTES_LEER')
  one(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id') @RequirePermissions('ESTUDIANTES_ACTUALIZAR')
  update(@Param('id') id: string, @Body() dto: UpdateEstudianteDto, @CurrentUser() user?: UsuarioAutenticado) { return this.service.update(id, dto, user?.id); }

  @Delete(':id') @RequirePermissions('ESTUDIANTES_ELIMINAR')
  remove(@Param('id') id: string, @CurrentUser() user?: UsuarioAutenticado) { return this.service.remove(id, user?.id); }
}
