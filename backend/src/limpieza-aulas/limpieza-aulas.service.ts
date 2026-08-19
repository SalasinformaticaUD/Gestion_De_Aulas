import { Injectable } from '@nestjs/common';
import { CreateLimpiezaAulaDto } from './dto/create-limpieza-aula.dto';
import { UpdateLimpiezaAulaDto } from './dto/update-limpieza-aula.dto';

@Injectable()
export class LimpiezaAulasService {
  create(createLimpiezaAulaDto: CreateLimpiezaAulaDto) {
    return 'This action adds a new limpiezaAula';
  }

  findAll() {
    return `This action returns all limpiezaAulas`;
  }

  findOne(id: string) {
    return `This action returns a #${id} limpiezaAula`;
  }

  update(id: string, updateLimpiezaAulaDto: UpdateLimpiezaAulaDto) {
    return `This action updates a #${id} limpiezaAula`;
  }

  remove(id: string) {
    return `This action removes a #${id} limpiezaAula`;
  }
}
