import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CargosController } from './cargos.controller';
import { CargosService } from './cargos.service';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [CargosController],
  providers: [CargosService],
})
export class CargosModule {}
