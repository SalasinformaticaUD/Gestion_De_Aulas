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
} from '@nestjs/common';
import { SoftwareService } from './software.service';
import { CreateSoftwareDto } from './dto/create-software.dto';
import { UpdateSoftwareDto } from './dto/update-software.dto';
import { AsignarSoftwareAulaDto } from './dto/create-aula-software.dto';
import { BuscarAulasPorSoftwareDto } from './dto/buscar-aulas-por-software.dto';
import { ImportarSoftwareDto } from './dto/importar-software.dto';

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
  create(@Body() createSoftwareDto: CreateSoftwareDto) {
    return this.softwareService.create(createSoftwareDto);
  }

  @Get()
  findAll() {
    return this.softwareService.findAll();
  }

  @Post('aulas/buscar-por-software')
  findAulasByMultipleSoftware(
    @Body() buscarAulasDto: BuscarAulasPorSoftwareDto,
  ) {
    return this.softwareService.findAulasByMultipleSoftware(
      buscarAulasDto.softwareIds,
    );
  }

  @Post('aulas/:aulaId')
  assignToAula(
    @Param('aulaId', ParseUUIDPipe) aulaId: string,
    @Body() asignarSoftwareAulaDto: AsignarSoftwareAulaDto,
  ) {
    return this.softwareService.assignToAula({
      aulaId,
      softwareId: asignarSoftwareAulaDto.softwareId,
      instaladoEn: asignarSoftwareAulaDto.instaladoEn,
    });
  }

  @Get('aulas/:aulaId')
  findByAula(@Param('aulaId', ParseUUIDPipe) aulaId: string) {
    return this.softwareService.findByAula(aulaId);
  }

  @Get(':id/aulas')
  findAulasBySoftware(@Param('id', ParseUUIDPipe) id: string) {
    return this.softwareService.findAulasBySoftware(id);
  }

  @Post('importaciones')
  importarInventario(@Body() importarSoftwareDto: ImportarSoftwareDto) {
    return this.softwareService.importInventory(importarSoftwareDto);
  }

  @Get('importaciones')
  findImportaciones() {
    return this.softwareService.findImportaciones();
  }

  @Delete('aulas/:aulaId/:softwareId')
  removeFromAula(
    @Param('aulaId', ParseUUIDPipe) aulaId: string,
    @Param('softwareId', ParseUUIDPipe) softwareId: string,
  ) {
    return this.softwareService.removeFromAula(aulaId, softwareId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.softwareService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSoftwareDto: UpdateSoftwareDto,
  ) {
    return this.softwareService.update(id, updateSoftwareDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.softwareService.remove(id);
  }
}
