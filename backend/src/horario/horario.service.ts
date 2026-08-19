import { Injectable } from '@nestjs/common';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';

@Injectable()
export class HorarioService {
  create(createHorarioDto: CreateHorarioDto) {
    return 'This action adds a new horario';
  }

  findAll() {
    return `This action returns all horario`;
  }

  findOne(id: string) {
    return `This action returns a #${id} horario`;
  }

  update(id: string, updateHorarioDto: UpdateHorarioDto) {
    return `This action updates a #${id} horario`;
  }

  remove(id: string) {
    return `This action removes a #${id} horario`;
  }
}
