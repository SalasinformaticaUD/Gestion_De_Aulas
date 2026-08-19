import { PartialType } from '@nestjs/mapped-types';
import { CreateDependenciaDto } from './create-dependencia.dto';

export class UpdateDependenciaDto extends PartialType(CreateDependenciaDto) {}
