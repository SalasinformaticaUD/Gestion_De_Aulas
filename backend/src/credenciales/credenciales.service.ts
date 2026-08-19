import { Injectable } from '@nestjs/common';
import { CreateCredencialeDto } from './dto/create-credenciale.dto';
import { UpdateCredencialeDto } from './dto/update-credenciale.dto';

@Injectable()
export class CredencialesService {
  create(createCredencialeDto: CreateCredencialeDto) {
    return 'This action adds a new credenciale';
  }

  findAll() {
    return `This action returns all credenciales`;
  }

  findOne(id: string) {
    return `This action returns a #${id} credenciale`;
  }

  update(id: string, updateCredencialeDto: UpdateCredencialeDto) {
    return `This action updates a #${id} credenciale`;
  }

  remove(id: string) {
    return `This action removes a #${id} credenciale`;
  }
}
