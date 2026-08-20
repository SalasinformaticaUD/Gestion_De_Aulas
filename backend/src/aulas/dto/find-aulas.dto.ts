import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EstadoAula } from '../../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class FindAulasDto {
  @IsOptional()
  @IsEnum(EstadoAula)
  estado?: EstadoAula;

  @Transform(trim)
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsUUID()
  proyectoCurricularId?: string;
}
