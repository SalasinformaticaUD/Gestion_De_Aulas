import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SoftwareService } from './software.service';
import { CreateSoftwareDto } from './dto/create-software.dto';
import { UpdateSoftwareDto } from './dto/update-software.dto';
import { AsignarSoftwareAulaDto } from './dto/create-aula-software.dto';
import { BuscarAulasPorSoftwareDto } from './dto/buscar-aulas-por-software.dto';
import { ImportarSoftwareDto } from './dto/importar-software.dto';
import { MODULOS } from '../auth/auth.constants';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@RequireModule(MODULOS.SOFTWARE)
@Controller('software')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class SoftwareController {
  constructor(private readonly softwareService: SoftwareService) {}

  @Post()
  @RequirePermissions('SOFTWARE_CREAR')
  create(@Body() createSoftwareDto: CreateSoftwareDto) {
    return this.softwareService.create(createSoftwareDto);
  }

  @Get()
  @RequirePermissions('SOFTWARE_LEER')
  findAll(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.softwareService.findAll(q, page ? Math.max(Number(page) || 1, 1) : undefined, limit ? Number(limit) : undefined);
  }

  @Post('aulas/buscar-por-software')
  @RequirePermissions('SOFTWARE_LEER')
  findAulasByMultipleSoftware(
    @Body() buscarAulasDto: BuscarAulasPorSoftwareDto,
  ) {
    return this.softwareService.findAulasByMultipleSoftware(
      buscarAulasDto.softwareIds,
    );
  }

  @Post('aulas/:aulaId')
  @RequirePermissions('SOFTWARE_CREAR')
  assignToAula(
    @Param('aulaId', ParseUUIDPipe) aulaId: string,
    @Body() asignarSoftwareAulaDto: AsignarSoftwareAulaDto,
  ) {
    return this.softwareService.assignToAula({
      aulaId,
      softwareId: asignarSoftwareAulaDto.softwareId,
      nombre: asignarSoftwareAulaDto.nombre,
      version: asignarSoftwareAulaDto.version,
      descripcion: asignarSoftwareAulaDto.descripcion,
      instaladoEn: asignarSoftwareAulaDto.instaladoEn,
    });
  }

  @Get('aulas/:aulaId')
  @RequirePermissions('SOFTWARE_LEER')
  findByAula(@Param('aulaId', ParseUUIDPipe) aulaId: string) {
    return this.softwareService.findByAula(aulaId);
  }

  @Get(':id/aulas')
  @RequirePermissions('SOFTWARE_LEER')
  findAulasBySoftware(@Param('id', ParseUUIDPipe) id: string) {
    return this.softwareService.findAulasBySoftware(id);
  }

  @Post('importaciones')
  @RequirePermissions('SOFTWARE_CREAR')
  importarInventario(@Body() importarSoftwareDto: ImportarSoftwareDto) {
    return this.softwareService.importInventory(importarSoftwareDto);
  }

  @Post('importaciones/excel')
  @RequirePermissions('SOFTWARE_CREAR')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 20_000_000 } }),
  )
  importarInventarioExcel(
    @UploadedFile()
    archivo:
      | { buffer: Buffer; originalname: string; mimetype: string }
      | undefined,
  ) {
    return this.softwareService.importInventoryExcel(archivo);
  }

  @Get('importaciones')
  @RequirePermissions('SOFTWARE_LEER')
  findImportaciones() {
    return this.softwareService.findImportaciones();
  }

  @Delete('aulas/:aulaId/:softwareId')
  @RequirePermissions('SOFTWARE_ELIMINAR')
  removeFromAula(
    @Param('aulaId', ParseUUIDPipe) aulaId: string,
    @Param('softwareId', ParseUUIDPipe) softwareId: string,
  ) {
    return this.softwareService.removeFromAula(aulaId, softwareId);
  }

  @Get(':id')
  @RequirePermissions('SOFTWARE_LEER')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.softwareService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('SOFTWARE_ACTUALIZAR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSoftwareDto: UpdateSoftwareDto,
  ) {
    return this.softwareService.update(id, updateSoftwareDto);
  }

  @Delete(':id')
  @RequirePermissions('SOFTWARE_ELIMINAR')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.softwareService.remove(id);
  }
}
