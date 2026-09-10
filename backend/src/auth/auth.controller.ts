import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { UsuarioAutenticado } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RequireAuth } from './decorators/require-auth.decorator';
import { LoginDto } from './dto/login.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @RequireAuth()
  @Get('me')
  me(@CurrentUser() usuario: UsuarioAutenticado) {
    return usuario;
  }

  @RequireAuth()
  @Post('verificar-contrasena-tareas')
  verificarContrasenaTareas(
    @Body() dto: VerifyPasswordDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.authService.autorizarEstadosRestringidosTarea(
      usuario.id,
      dto.password,
    );
  }

  @RequireAuth()
  @Post('cambiar-contrasena')
  cambiarContrasena(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.authService.cambiarContrasena(
      usuario.id,
      dto.contrasenaActual,
      dto.nuevaContrasena,
    );
  }
}
