import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstadoCuenta } from '../../../generated/prisma/enums.js';

export class FindUsuariosDto {
  @IsOptional()
  @IsEnum(EstadoCuenta)
  estado?: EstadoCuenta;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsUUID('4')
  dependenciaId?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsUUID('4')
  rolId?: string;
}
