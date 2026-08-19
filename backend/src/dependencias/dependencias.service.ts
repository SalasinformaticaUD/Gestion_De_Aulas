import { Injectable } from '@nestjs/common';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

@Injectable()
export class DependenciasService {
  create(createDependenciaDto: CreateDependenciaDto) {
    return 'This action adds a new dependencia';
  }

  findAll() {
    return `This action returns all dependencias`;
  }

  findOne(id: string) {
    return `This action returns a #${id} dependencia`;
  }

  update(id: string, updateDependenciaDto: UpdateDependenciaDto) {
    return `This action updates a #${id} dependencia`;
  }

  remove(id: string) {
    return `This action removes a #${id} dependencia`;
  }
}
