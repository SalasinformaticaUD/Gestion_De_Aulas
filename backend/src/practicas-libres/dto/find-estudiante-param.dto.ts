import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class FindEstudianteParamDto {
  @Transform(trim)
  @IsString()
  @Length(3, 30)
  codigo!: string;
}
