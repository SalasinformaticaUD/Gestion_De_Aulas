import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateDocenteDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) nombre!: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) documento!: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) proyecto!: string;
}
