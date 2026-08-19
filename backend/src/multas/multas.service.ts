import { Injectable } from '@nestjs/common';
import { CreateMultaDto } from './dto/create-multa.dto';
import { UpdateMultaDto } from './dto/update-multa.dto';

@Injectable()
export class MultasService {
  create(createMultaDto: CreateMultaDto) {
    return 'This action adds a new multa';
  }

  findAll() {
    return `This action returns all multas`;
  }

  findOne(id: string) {
    return `This action returns a #${id} multa`;
  }

  update(id: string, updateMultaDto: UpdateMultaDto) {
    return `This action updates a #${id} multa`;
  }

  remove(id: string) {
    return `This action removes a #${id} multa`;
  }
}
