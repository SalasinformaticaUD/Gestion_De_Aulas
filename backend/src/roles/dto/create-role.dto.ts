import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permisoIds?: string[];

  @IsOptional()
  @IsIn(['ADMIN', 'LIDER'])
  perfilMonitores?: 'ADMIN' | 'LIDER' | null;

  @IsOptional()
  @IsIn(['PHYSICS', 'INFORMATICS_LABS', 'ELECTRICAL'])
  dependenciaMonitores?: 'PHYSICS' | 'INFORMATICS_LABS' | 'ELECTRICAL' | null;
}