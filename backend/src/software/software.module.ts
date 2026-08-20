import { Module } from '@nestjs/common';
import { SoftwareService } from './software.service';
import { SoftwareController } from './software.controller';
import { SoftwarePrismaService } from './software-prisma.service';
import { SOFTWARE_PRISMA } from './software.constants';

@Module({
  controllers: [SoftwareController],
  providers: [
    SoftwareService,
    { provide: SOFTWARE_PRISMA, useClass: SoftwarePrismaService },
  ],
  exports: [SoftwareService],
})
export class SoftwareModule {}
