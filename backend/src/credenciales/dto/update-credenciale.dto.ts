import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCredencialeDto } from './create-credenciale.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';
export class UpdateCredencialeDto extends PartialType(
  OmitType(CreateCredencialeDto, ['estado'] as const),
) {
  @IsOptional() @IsString() @MaxLength(500) motivoCambio?: string;
}
