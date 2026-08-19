import { Injectable } from '@nestjs/common';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';

@Injectable()
export class PermisosService {
  create(createPermisoDto: CreatePermisoDto) {
    return 'This action adds a new permiso';
  }

  findAll() {
    return `This action returns all permisos`;
  }

  findOne(id: string) {
    return `This action returns a #${id} permiso`;
  }

  update(id: string, updatePermisoDto: UpdatePermisoDto) {
    return `This action updates a #${id} permiso`;
  }

  remove(id: string) {
    return `This action removes a #${id} permiso`;
  }
}
