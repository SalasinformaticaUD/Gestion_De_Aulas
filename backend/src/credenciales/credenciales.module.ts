import { Module } from '@nestjs/common';
import { CredencialesService } from './credenciales.service';
import { CredencialesController } from './credenciales.controller';

@Module({
  controllers: [CredencialesController],
  providers: [CredencialesService],
})
export class CredencialesModule {}
