import { Module } from '@nestjs/common';
import { MultasService } from './multas.service';
import { MultasController } from './multas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [MultasController],
  providers: [MultasService],
  exports: [MultasService],
})
export class MultasModule {}
