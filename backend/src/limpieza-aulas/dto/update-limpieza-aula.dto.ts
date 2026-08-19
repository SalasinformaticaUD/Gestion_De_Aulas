import { PartialType } from '@nestjs/mapped-types';
import { CreateLimpiezaAulaDto } from './create-limpieza-aula.dto';

export class UpdateLimpiezaAulaDto extends PartialType(CreateLimpiezaAulaDto) {}
