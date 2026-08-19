import { Injectable } from '@nestjs/common';
import { CreateSoftwareDto } from './dto/create-software.dto';
import { UpdateSoftwareDto } from './dto/update-software.dto';

@Injectable()
export class SoftwareService {
  create(createSoftwareDto: CreateSoftwareDto) {
    return 'This action adds a new software';
  }

  findAll() {
    return `This action returns all software`;
  }

  findOne(id: string) {
    return `This action returns a #${id} software`;
  }

  update(id: string, updateSoftwareDto: UpdateSoftwareDto) {
    return `This action updates a #${id} software`;
  }

  remove(id: string) {
    return `This action removes a #${id} software`;
  }
}
