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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/auth.types';

@RequireModule(MODULOS.AULAS)
@Controller('aulas')
export class AulasController {
  constructor(private readonly aulasService: AulasService) {}

  @Post()
  create(
    @Body() createAulaDto: CreateAulaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.aulasService.create(createAulaDto, usuario?.id);
  }

  @Post('importar/excel')
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
  findAll(@Query() filters: FindAulasDto) {
    return this.aulasService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.aulasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAulaDto: UpdateAulaDto,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.aulasService.update(id, updateAulaDto, usuario?.id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario?: UsuarioAutenticado,
  ) {
    return this.aulasService.remove(id, usuario?.id);
  }
}
