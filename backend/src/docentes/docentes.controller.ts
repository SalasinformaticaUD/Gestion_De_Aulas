import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MODULOS } from '../auth/auth.constants';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { DocentesService } from './docentes.service';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
@RequireAuth() @RequireModule(MODULOS.DOCENTES) @Controller('docentes')
export class DocentesController { constructor(private readonly service: DocentesService) {} @Post() @RequirePermissions('DOCENTES_CREAR') create(@Body() dto: CreateDocenteDto, @CurrentUser() user?: UsuarioAutenticado) { return this.service.create(dto, user?.id); } @Get() @RequirePermissions('DOCENTES_LEER') findAll(@Query('q') q?: string) { return this.service.findAll(q); } @Get(':id') @RequirePermissions('DOCENTES_LEER') one(@Param('id') id: string) { return this.service.findOne(id); } @Patch(':id') @RequirePermissions('DOCENTES_ACTUALIZAR') update(@Param('id') id: string, @Body() dto: UpdateDocenteDto, @CurrentUser() user?: UsuarioAutenticado) { return this.service.update(id, dto, user?.id); } @Delete(':id') @RequirePermissions('DOCENTES_ELIMINAR') remove(@Param('id') id: string, @CurrentUser() user?: UsuarioAutenticado) { return this.service.remove(id, user?.id); } }
