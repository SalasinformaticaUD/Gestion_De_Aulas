import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PanelOperativoService } from './panel-operativo.service';
import { CreatePanelOperativoDto } from './dto/create-panel-operativo.dto';
import { UpdatePanelOperativoDto } from './dto/update-panel-operativo.dto';

@Controller('panel-operativo')
export class PanelOperativoController {
  constructor(private readonly panelOperativoService: PanelOperativoService) {}

  @Post()
  create(@Body() createPanelOperativoDto: CreatePanelOperativoDto) {
    return this.panelOperativoService.create(createPanelOperativoDto);
  }

  @Get()
  findAll() {
    return this.panelOperativoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.panelOperativoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePanelOperativoDto: UpdatePanelOperativoDto,
  ) {
    return this.panelOperativoService.update(id, updatePanelOperativoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.panelOperativoService.remove(id);
  }
}
