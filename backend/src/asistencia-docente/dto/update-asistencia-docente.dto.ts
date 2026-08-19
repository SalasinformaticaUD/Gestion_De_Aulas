import { PartialType } from '@nestjs/mapped-types';
import { CreateAsistenciaDocenteDto } from './create-asistencia-docente.dto';

export class UpdateAsistenciaDocenteDto extends PartialType(
  CreateAsistenciaDocenteDto,
) {}
