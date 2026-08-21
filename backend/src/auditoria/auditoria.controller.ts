import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditoriaService } from './auditoria.service';
import { FindAuditoriaDto } from './dto/find-auditoria.dto';

@RequireModule('ADMINISTRACION')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @RequirePermissions('ADMINISTRACION_LEER')
  findAll(@Query() filters: FindAuditoriaDto) {
    return this.auditoriaService.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('ADMINISTRACION_LEER')
  findOne(@Param('id') id: string) {
    return this.auditoriaService.findOne(id);
  }
}
