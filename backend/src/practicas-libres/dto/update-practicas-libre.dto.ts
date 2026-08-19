import { PartialType } from '@nestjs/mapped-types';
import { CreatePracticasLibreDto } from './create-practicas-libre.dto';

export class UpdatePracticasLibreDto extends PartialType(
  CreatePracticasLibreDto,
) {}
