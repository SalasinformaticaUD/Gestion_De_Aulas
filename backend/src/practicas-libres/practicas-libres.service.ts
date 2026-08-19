import { Injectable } from '@nestjs/common';
import { CreatePracticasLibreDto } from './dto/create-practicas-libre.dto';
import { UpdatePracticasLibreDto } from './dto/update-practicas-libre.dto';

@Injectable()
export class PracticasLibresService {
  create(createPracticasLibreDto: CreatePracticasLibreDto) {
    return 'This action adds a new practicasLibre';
  }

  findAll() {
    return `This action returns all practicasLibres`;
  }

  findOne(id: string) {
    return `This action returns a #${id} practicasLibre`;
  }

  update(id: string, updatePracticasLibreDto: UpdatePracticasLibreDto) {
    return `This action updates a #${id} practicasLibre`;
  }

  remove(id: string) {
    return `This action removes a #${id} practicasLibre`;
  }
}
