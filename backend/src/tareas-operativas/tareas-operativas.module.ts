import { Module } from '@nestjs/common';
import { TareasOperativasService } from './tareas-operativas.service';
import { TareasOperativasController } from './tareas-operativas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [TareasOperativasController],
  providers: [TareasOperativasService],
  exports: [TareasOperativasService],
})
export class TareasOperativasModule {}
