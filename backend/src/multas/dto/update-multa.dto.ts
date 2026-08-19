import { PartialType } from '@nestjs/mapped-types';
import { CreateMultaDto } from './create-multa.dto';

export class UpdateMultaDto extends PartialType(CreateMultaDto) {}
