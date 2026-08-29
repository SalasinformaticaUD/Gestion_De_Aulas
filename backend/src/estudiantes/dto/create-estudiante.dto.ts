import { Transform } from 'class-transformer'; import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CreateEstudianteDto { @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) codigo!: string; @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) nombre!: string; @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsOptional() @IsEmail() @MaxLength(254) correo?: string; }
