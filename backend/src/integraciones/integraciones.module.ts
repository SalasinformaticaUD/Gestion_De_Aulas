import { Module } from '@nestjs/common';
import { IntegracionesController } from './integraciones.controller';
import { MonitoresProvisioningController } from './monitores-provisioning.controller';
import { AuthModule } from '../auth/auth.module';
import { MonitoresClientService } from './monitores-client.service';
import { MonitoresProvisioningService } from './monitores-provisioning.service';
import { MonitoresServiceTokenGuard } from './monitores-service-token.guard';

@Module({
  imports: [AuthModule],
  controllers: [IntegracionesController, MonitoresProvisioningController],
  providers: [
    MonitoresClientService,
    MonitoresProvisioningService,
    MonitoresServiceTokenGuard,
  ],
  exports: [MonitoresClientService],
})
export class IntegracionesModule {}
