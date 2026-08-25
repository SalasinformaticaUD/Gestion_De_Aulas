import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EstadoEquipo } from '../../../generated/prisma/enums.js';

export class FindEquiposAudiovisualesDto {
  @IsOptional()
  @IsEnum(EstadoEquipo)
  estado?: EstadoEquipo;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  pagina = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limite = 20;
}
