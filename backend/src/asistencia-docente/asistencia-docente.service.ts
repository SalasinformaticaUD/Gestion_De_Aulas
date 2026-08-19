import { Injectable } from '@nestjs/common';
import { CreateAsistenciaDocenteDto } from './dto/create-asistencia-docente.dto';
import { UpdateAsistenciaDocenteDto } from './dto/update-asistencia-docente.dto';

@Injectable()
export class AsistenciaDocenteService {
  create(createAsistenciaDocenteDto: CreateAsistenciaDocenteDto) {
    return 'This action adds a new asistenciaDocente';
  }

  findAll() {
    return `This action returns all asistenciaDocente`;
  }

  findOne(id: string) {
    return `This action returns a #${id} asistenciaDocente`;
  }

  update(id: string, updateAsistenciaDocenteDto: UpdateAsistenciaDocenteDto) {
    return `This action updates a #${id} asistenciaDocente`;
  }

  remove(id: string) {
    return `This action removes a #${id} asistenciaDocente`;
  }
}
