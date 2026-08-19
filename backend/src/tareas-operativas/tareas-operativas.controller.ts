import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TareasOperativasService } from './tareas-operativas.service';
import { CreateTareasOperativaDto } from './dto/create-tareas-operativa.dto';
import { UpdateTareasOperativaDto } from './dto/update-tareas-operativa.dto';

@Controller('tareas-operativas')
export class TareasOperativasController {
  constructor(
    private readonly tareasOperativasService: TareasOperativasService,
  ) {}

  @Post()
  create(@Body() createTareasOperativaDto: CreateTareasOperativaDto) {
    return this.tareasOperativasService.create(createTareasOperativaDto);
  }

  @Get()
  findAll() {
    return this.tareasOperativasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tareasOperativasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTareasOperativaDto: UpdateTareasOperativaDto,
  ) {
    return this.tareasOperativasService.update(id, updateTareasOperativaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tareasOperativasService.remove(id);
  }
}
