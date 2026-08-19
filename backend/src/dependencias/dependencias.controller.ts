import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DependenciasService } from './dependencias.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Controller('dependencias')
export class DependenciasController {
  constructor(private readonly dependenciasService: DependenciasService) {}

  @Post()
  create(@Body() createDependenciaDto: CreateDependenciaDto) {
    return this.dependenciasService.create(createDependenciaDto);
  }

  @Get()
  findAll() {
    return this.dependenciasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dependenciasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDependenciaDto: UpdateDependenciaDto,
  ) {
    return this.dependenciasService.update(id, updateDependenciaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dependenciasService.remove(id);
  }
}
