import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthTokenService } from './auth-token.service';
import { PasswordHashService } from './password-hash.service';
import { AuthenticationGuard } from './guards/authentication.guard';
import { ModulePermissionsGuard } from './guards/module-permissions.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    PasswordHashService,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: ModulePermissionsGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, AuthTokenService, PasswordHashService],
})
export class AuthModule {}
