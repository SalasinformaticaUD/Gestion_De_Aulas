import { PartialType } from '@nestjs/mapped-types';
import { CreateCredencialeDto } from './create-credenciale.dto';

export class UpdateCredencialeDto extends PartialType(CreateCredencialeDto) {}
