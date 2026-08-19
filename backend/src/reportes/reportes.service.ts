import { Injectable } from '@nestjs/common';
import { CreateReporteDto } from './dto/create-reporte.dto';
import { UpdateReporteDto } from './dto/update-reporte.dto';

@Injectable()
export class ReportesService {
  create(createReporteDto: CreateReporteDto) {
    return 'This action adds a new reporte';
  }

  findAll() {
    return `This action returns all reportes`;
  }

  findOne(id: string) {
    return `This action returns a #${id} reporte`;
  }

  update(id: string, updateReporteDto: UpdateReporteDto) {
    return `This action updates a #${id} reporte`;
  }

  remove(id: string) {
    return `This action removes a #${id} reporte`;
  }
}
