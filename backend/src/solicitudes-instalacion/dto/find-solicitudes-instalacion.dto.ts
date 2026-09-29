import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const ESTADOS_SOLICITUD_INSTALACION = [
  'PENDIENTE_REVISION',
  'REQUIERE_AJUSTES',
  'APROBADA_PARCIAL',
  'APROBADA',
  'EN_EJECUCION',
  'FINALIZADA',
  'RECHAZADA',
  'CANCELADA',
] as const;

export class FindSolicitudesInstalacionDto {
  @IsOptional() @IsIn(['actuales', 'historial', 'todas']) vista?:
    'actuales' | 'historial' | 'todas';
  @IsOptional()
  @IsIn(ESTADOS_SOLICITUD_INSTALACION)
  estado?: (typeof ESTADOS_SOLICITUD_INSTALACION)[number];
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
  @IsOptional() @IsUUID() periodoId?: string;
  @IsOptional() @IsUUID() docenteId?: string;
  @IsOptional() @IsUUID() proyectoCurricularId?: string;
  @IsOptional() @IsUUID() aulaId?: string;
  @IsOptional() @IsUUID() asignaturaId?: string;
  @IsOptional() @IsUUID() softwareId?: string;
  @IsOptional() @IsString() docente?: string;
  @IsOptional() @IsString() proyectoCurricular?: string;
  @IsOptional() @IsString() aula?: string;
  @IsOptional() @IsString() asignatura?: string;
  @IsOptional() @IsString() software?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['fechaPeticion', 'docente', 'estado']) orden?:
    'fechaPeticion' | 'docente' | 'estado';
  @IsOptional() @IsIn(['asc', 'desc']) direccion?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
}
