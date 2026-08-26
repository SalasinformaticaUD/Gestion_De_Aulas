import { Module } from '@nestjs/common';
import { CredencialesService } from './credenciales.service';
import { CredencialesController } from './credenciales.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { CredencialesCifradoService } from './credenciales-cifrado.service';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [CredencialesController],
  providers: [CredencialesService, CredencialesCifradoService],
})
export class CredencialesModule {}
