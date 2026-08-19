import { PartialType } from '@nestjs/mapped-types';
import { CreatePrestamosDocenteDto } from './create-prestamos-docente.dto';

export class UpdatePrestamosDocenteDto extends PartialType(
  CreatePrestamosDocenteDto,
) {}
