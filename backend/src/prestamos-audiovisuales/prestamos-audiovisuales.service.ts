import { Injectable } from '@nestjs/common';
import { CreatePrestamosAudiovisualeDto } from './dto/create-prestamos-audiovisuale.dto';
import { UpdatePrestamosAudiovisualeDto } from './dto/update-prestamos-audiovisuale.dto';

@Injectable()
export class PrestamosAudiovisualesService {
  create(createPrestamosAudiovisualeDto: CreatePrestamosAudiovisualeDto) {
    return 'This action adds a new prestamosAudiovisuale';
  }

  findAll() {
    return `This action returns all prestamosAudiovisuales`;
  }

  findOne(id: string) {
    return `This action returns a #${id} prestamosAudiovisuale`;
  }

  update(
    id: string,
    updatePrestamosAudiovisualeDto: UpdatePrestamosAudiovisualeDto,
  ) {
    return `This action updates a #${id} prestamosAudiovisuale`;
  }

  remove(id: string) {
    return `This action removes a #${id} prestamosAudiovisuale`;
  }
}
