import { PartialType } from '@nestjs/mapped-types';
import { CreatePanelOperativoDto } from './create-panel-operativo.dto';

export class UpdatePanelOperativoDto extends PartialType(
  CreatePanelOperativoDto,
) {}
