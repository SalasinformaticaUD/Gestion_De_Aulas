import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { RequireModule } from '../auth/decorators/require-module.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MonitoresClientService } from './monitores-client.service';

@RequireModule('MONITORES')
@Controller('integraciones/monitores')
export class IntegracionesController {
  constructor(private readonly monitores: MonitoresClientService) {}

  @Get('estado')
  @RequirePermissions('MONITORES_LEER')
  estado() {
    return this.monitores.estado();
  }

  @Get('usuario/:usuarioExternoId')
  @RequirePermissions('MONITORES_LEER')
  usuario(@Param('usuarioExternoId', ParseUUIDPipe) usuarioExternoId: string) {
    return this.monitores.buscarUsuario(usuarioExternoId);
  }
}
