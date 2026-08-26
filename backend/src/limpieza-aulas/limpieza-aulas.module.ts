import { Module } from '@nestjs/common';
import { LimpiezaAulasService } from './limpieza-aulas.service';
import { LimpiezaAulasController } from './limpieza-aulas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [LimpiezaAulasController],
  providers: [LimpiezaAulasService],
  exports: [LimpiezaAulasService],
})
export class LimpiezaAulasModule {}
