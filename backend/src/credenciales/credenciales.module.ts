import { Module } from '@nestjs/common';
import { CredencialesService } from './credenciales.service';
import { CredencialesController } from './credenciales.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { CredencialesCifradoService } from './credenciales-cifrado.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuditoriaModule, AuthModule],
  controllers: [CredencialesController],
  providers: [CredencialesService, CredencialesCifradoService],
})
export class CredencialesModule {}
