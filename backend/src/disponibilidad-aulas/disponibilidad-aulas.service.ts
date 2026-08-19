import { Injectable } from '@nestjs/common';
import { CreateDisponibilidadAulaDto } from './dto/create-disponibilidad-aula.dto';
import { UpdateDisponibilidadAulaDto } from './dto/update-disponibilidad-aula.dto';

@Injectable()
export class DisponibilidadAulasService {
  create(createDisponibilidadAulaDto: CreateDisponibilidadAulaDto) {
    return 'This action adds a new disponibilidadAula';
  }

  findAll() {
    return `This action returns all disponibilidadAulas`;
  }

  findOne(id: string) {
    return `This action returns a #${id} disponibilidadAula`;
  }

  update(id: string, updateDisponibilidadAulaDto: UpdateDisponibilidadAulaDto) {
    return `This action updates a #${id} disponibilidadAula`;
  }

  remove(id: string) {
    return `This action removes a #${id} disponibilidadAula`;
  }
}
