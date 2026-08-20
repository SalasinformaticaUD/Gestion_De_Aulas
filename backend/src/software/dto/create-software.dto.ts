import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSoftwareDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  version!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  descripcion?: string;
}
