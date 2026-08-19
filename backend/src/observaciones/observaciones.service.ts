import { Injectable } from '@nestjs/common';
import { CreateObservacioneDto } from './dto/create-observacione.dto';
import { UpdateObservacioneDto } from './dto/update-observacione.dto';

@Injectable()
export class ObservacionesService {
  create(createObservacioneDto: CreateObservacioneDto) {
    return 'This action adds a new observacione';
  }

  findAll() {
    return `This action returns all observaciones`;
  }

  findOne(id: string) {
    return `This action returns a #${id} observacione`;
  }

  update(id: string, updateObservacioneDto: UpdateObservacioneDto) {
    return `This action updates a #${id} observacione`;
  }

  remove(id: string) {
    return `This action removes a #${id} observacione`;
  }
}
