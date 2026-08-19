import { Injectable } from '@nestjs/common';
import { CreateTareasOperativaDto } from './dto/create-tareas-operativa.dto';
import { UpdateTareasOperativaDto } from './dto/update-tareas-operativa.dto';

@Injectable()
export class TareasOperativasService {
  create(createTareasOperativaDto: CreateTareasOperativaDto) {
    return 'This action adds a new tareasOperativa';
  }

  findAll() {
    return `This action returns all tareasOperativas`;
  }

  findOne(id: string) {
    return `This action returns a #${id} tareasOperativa`;
  }

  update(id: string, updateTareasOperativaDto: UpdateTareasOperativaDto) {
    return `This action updates a #${id} tareasOperativa`;
  }

  remove(id: string) {
    return `This action removes a #${id} tareasOperativa`;
  }
}
