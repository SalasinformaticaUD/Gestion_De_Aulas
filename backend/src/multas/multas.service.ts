import { Injectable } from '@nestjs/common';
import { CreateMultaDto } from './dto/create-multa.dto';
import { UpdateMultaDto } from './dto/update-multa.dto';

@Injectable()
export class MultasService {
  create(createMultaDto: CreateMultaDto) {
    void createMultaDto;
    return 'This action adds a new multa';
  }

  findAll(filters?: {
    estado?: string;
    estudianteId?: string;
    codigo?: string;
  }) {
    void filters;
    return `This action returns all multas`;
  }

  findOne(id: string) {
    return `This action returns a #${id} multa`;
  }

  cumplir(id: string) {
    return `This action marks a #${id} multa as fulfilled`;
  }

  anular(id: string, updateMultaDto: UpdateMultaDto) {
    void updateMultaDto;
    return `This action voids a #${id} multa`;
  }

  findAllMotivos() {
    return 'This action returns all multa motives';
  }

  createMotivo(createMotivoMultaDto: unknown) {
    void createMotivoMultaDto;
    return 'This action adds a new multa motive';
  }
}
