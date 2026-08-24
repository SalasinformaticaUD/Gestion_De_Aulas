import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ProvisionMonitorUserDto } from './dto/provision-monitor-user.dto';
import { MonitoresProvisioningService } from './monitores-provisioning.service';
import { MonitoresServiceTokenGuard } from './monitores-service-token.guard';

@Public()
@Controller('integraciones/monitores')
export class MonitoresProvisioningController {
  constructor(private readonly provisioning: MonitoresProvisioningService) {}

  @Post('usuarios')
  @UseGuards(MonitoresServiceTokenGuard)
  provisionarUsuario(@Body() dto: ProvisionMonitorUserDto) {
    return this.provisioning.provision(dto);
  }
}
