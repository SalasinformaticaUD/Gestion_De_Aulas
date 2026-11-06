import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAdministrator } from '../auth/decorators/require-administrator.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { UpdateConfiguracionDistribucionPdfDto } from './dto/update-configuracion-distribucion-pdf.dto';
import { ReportesService } from './reportes.service';

@RequireAuth()
@RequireAdministrator()
@Controller('configuracion-distribucion-pdf')
export class ConfiguracionDistribucionPdfController {
  constructor(private readonly reportes: ReportesService) {}

  @Get()
  obtener() {
    return this.reportes.obtenerConfiguracionDistribucionPdf();
  }

  @Patch()
  actualizar(
    @Body() dto: UpdateConfiguracionDistribucionPdfDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.reportes.actualizarConfiguracionDistribucionPdf(
      dto,
      usuario.id,
    );
  }
}
