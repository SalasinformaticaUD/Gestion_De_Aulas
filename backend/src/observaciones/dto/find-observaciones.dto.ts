import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TipoObservacion } from '../../../generated/prisma/enums.js';

export class FindObservacionesDto {
  @IsOptional()
  @IsUUID()
  aulaId?: string;

  @IsOptional()
  @IsEnum(TipoObservacion)
  tipo?: TipoObservacion;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  vigentes?: boolean;
}
