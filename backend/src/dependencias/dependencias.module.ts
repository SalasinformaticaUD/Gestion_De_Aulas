import { Module } from '@nestjs/common';
import { DependenciasService } from './dependencias.service';
import { DependenciasController } from './dependencias.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [DependenciasController],
  providers: [DependenciasService],
})
export class DependenciasModule {}
