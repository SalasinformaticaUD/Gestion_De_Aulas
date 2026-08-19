import { Injectable } from '@nestjs/common';
import { CreatePrestamoAudiovisualDto } from './dto/create-prestamo-audiovisual.dto';

@Injectable()
export class PrestamosAudiovisualesService {
  create(createPrestamoAudiovisualDto: CreatePrestamoAudiovisualDto) {
    void createPrestamoAudiovisualDto;
    return 'This action adds a new prestamo audiovisual';
  }

  findAll() {
    return 'This action returns all prestamos audiovisuales';
  }

  findOne(id: string) {
    return `This action returns a #${id} prestamo audiovisual`;
  }
}
