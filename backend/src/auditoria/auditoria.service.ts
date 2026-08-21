import { Injectable } from '@nestjs/common';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';

@Injectable()
export class AuditoriaService {
  create(createAuditoriaDto: CreateAuditoriaDto) {
    void createAuditoriaDto;
    return 'This action adds a new auditoria';
  }

  findAll() {
    return `This action returns all auditoria`;
  }

  findOne(id: string) {
    return `This action returns a #${id} auditoria`;
  }

  update(id: string, updateAuditoriaDto: UpdateAuditoriaDto) {
    void updateAuditoriaDto;
    return `This action updates a #${id} auditoria`;
  }

  remove(id: string) {
    return `This action removes a #${id} auditoria`;
  }
}
