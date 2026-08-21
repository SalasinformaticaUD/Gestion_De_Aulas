import { Injectable } from '@nestjs/common';
import { CreatePrestamosDocenteDto } from './dto/create-prestamos-docente.dto';
import { UpdatePrestamosDocenteDto } from './dto/update-prestamos-docente.dto';

@Injectable()
export class PrestamosDocentesService {
  create(createPrestamosDocenteDto: CreatePrestamosDocenteDto) {
    void createPrestamosDocenteDto;
    return 'This action adds a new prestamosDocente';
  }

  findAll() {
    return `This action returns all prestamosDocentes`;
  }

  findOne(id: string) {
    return `This action returns a #${id} prestamosDocente`;
  }

  update(id: string, updatePrestamosDocenteDto: UpdatePrestamosDocenteDto) {
    void updatePrestamosDocenteDto;
    return `This action updates a #${id} prestamosDocente`;
  }

  remove(id: string) {
    return `This action removes a #${id} prestamosDocente`;
  }
}
