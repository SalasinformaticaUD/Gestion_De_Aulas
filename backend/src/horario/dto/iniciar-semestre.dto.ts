import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CreatePeriodoAcademicoDto } from './create-periodo-academico.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class IniciarSemestreDto extends CreatePeriodoAcademicoDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  passwordConfirmacion!: string;
}
