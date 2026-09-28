import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { IntegracionesModule } from '../integraciones/integraciones.module';

@Module({
  imports: [PrismaModule, AuditoriaModule, IntegracionesModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
