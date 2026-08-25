import { IsDateString, IsUUID } from 'class-validator';

export class ConsultarHistorialDisponibilidadDto {
  @IsUUID('4')
  aulaId!: string;

  @IsDateString()
  desde!: string;

  @IsDateString()
  hasta!: string;
}
