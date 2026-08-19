import { PartialType } from '@nestjs/mapped-types';
import { CreateDisponibilidadAulaDto } from './create-disponibilidad-aula.dto';

export class UpdateDisponibilidadAulaDto extends PartialType(
  CreateDisponibilidadAulaDto,
) {}
