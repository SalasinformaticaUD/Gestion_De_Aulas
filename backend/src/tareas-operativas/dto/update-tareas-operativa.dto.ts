import { PartialType } from '@nestjs/mapped-types';
import { CreateTareasOperativaDto } from './create-tareas-operativa.dto';

export class UpdateTareasOperativaDto extends PartialType(
  CreateTareasOperativaDto,
) {}
