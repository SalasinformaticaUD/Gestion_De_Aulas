import { Injectable } from '@nestjs/common';
import { CreateAulaDto } from './dto/create-aula.dto';
import { UpdateAulaDto } from './dto/update-aula.dto';

@Injectable()
export class AulasService {
  create(createAulaDto: CreateAulaDto) {
    void createAulaDto;
    return 'This action adds a new aula';
  }

  findAll() {
    return `This action returns all aulas`;
  }

  findOne(id: string) {
    return `This action returns a #${id} aula`;
  }

  update(id: string, updateAulaDto: UpdateAulaDto) {
    void updateAulaDto;
    return `This action updates a #${id} aula`;
  }

  remove(id: string) {
    return `This action removes a #${id} aula`;
  }
}
