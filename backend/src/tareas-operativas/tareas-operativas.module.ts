import { Module } from '@nestjs/common';
import { TareasOperativasService } from './tareas-operativas.service';
import { TareasOperativasController } from './tareas-operativas.controller';

@Module({
  controllers: [TareasOperativasController],
  providers: [TareasOperativasService],
})
export class TareasOperativasModule {}
