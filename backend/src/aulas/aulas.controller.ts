import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AulasService } from './aulas.service';
import { CreateAulaDto } from './dto/create-aula.dto';
import { UpdateAulaDto } from './dto/update-aula.dto';
import { FindAulasDto } from './dto/find-aulas.dto';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireModule(MODULOS.AULAS)
@Controller('aulas')
export class AulasController {
  constructor(private readonly aulasService: AulasService) {}

  @Post()
  @RequirePermissions('AULAS_CREAR')
  create(
    @Body() createAulaDto: CreateAulaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.aulasService.create(createAulaDto, usuario?.id);
  }

  @Post('importar/excel')
  @RequirePermissions('AULAS_CREAR')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 5_000_000 } }),
  )
  importarExcel(
    @UploadedFile()
    archivo: { buffer: Buffer; originalname: string } | undefined,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.aulasService.importarExcel(archivo, usuario?.id);
  }

  @Get()
  @RequirePermissions('AULAS_LEER')
  findAll(@Query() filters: FindAulasDto) {
    return this.aulasService.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('AULAS_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.aulasService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('AULAS_ACTUALIZAR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAulaDto: UpdateAulaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.aulasService.update(id, updateAulaDto, usuario?.id);
  }

  @Delete(':id')
  @RequirePermissions('AULAS_ELIMINAR')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.aulasService.remove(id, usuario?.id);
  }
}
