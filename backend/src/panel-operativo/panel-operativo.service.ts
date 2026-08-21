import { Injectable } from '@nestjs/common';
import { CreatePanelOperativoDto } from './dto/create-panel-operativo.dto';
import { UpdatePanelOperativoDto } from './dto/update-panel-operativo.dto';

@Injectable()
export class PanelOperativoService {
  create(createPanelOperativoDto: CreatePanelOperativoDto) {
    void createPanelOperativoDto;
    return 'This action adds a new panelOperativo';
  }

  findAll() {
    return `This action returns all panelOperativo`;
  }

  findOne(id: string) {
    return `This action returns a #${id} panelOperativo`;
  }

  update(id: string, updatePanelOperativoDto: UpdatePanelOperativoDto) {
    void updatePanelOperativoDto;
    return `This action updates a #${id} panelOperativo`;
  }

  remove(id: string) {
    return `This action removes a #${id} panelOperativo`;
  }
}
