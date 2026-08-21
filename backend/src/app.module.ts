import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HorarioModule } from './horario/horario.module';
import { DisponibilidadAulasModule } from './disponibilidad-aulas/disponibilidad-aulas.module';
import { AsistenciaDocenteModule } from './asistencia-docente/asistencia-docente.module';
import { PracticasLibresModule } from './practicas-libres/practicas-libres.module';
import { PrestamosDocentesModule } from './prestamos-docentes/prestamos-docentes.module';
import { PrestamosAudiovisualesModule } from './prestamos-audiovisuales/prestamos-audiovisuales.module';
import { SoftwareModule } from './software/software.module';
import { AulasModule } from './aulas/aulas.module';
import { MultasModule } from './multas/multas.module';
import { ObservacionesModule } from './observaciones/observaciones.module';
import { LimpiezaAulasModule } from './limpieza-aulas/limpieza-aulas.module';
import { TareasOperativasModule } from './tareas-operativas/tareas-operativas.module';
import { CredencialesModule } from './credenciales/credenciales.module';
import { ReportesModule } from './reportes/reportes.module';
import { PanelOperativoModule } from './panel-operativo/panel-operativo.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { PermisosModule } from './permisos/permisos.module';
import { DependenciasModule } from './dependencias/dependencias.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { HealthModule } from './health/health.module';
import { IntegracionesModule } from './integraciones/integraciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    HorarioModule,
    DisponibilidadAulasModule,
    AsistenciaDocenteModule,
    PracticasLibresModule,
    PrestamosDocentesModule,
    PrestamosAudiovisualesModule,
    SoftwareModule,
    AulasModule,
    MultasModule,
    ObservacionesModule,
    LimpiezaAulasModule,
    TareasOperativasModule,
    CredencialesModule,
    ReportesModule,
    PanelOperativoModule,
    UsuariosModule,
    RolesModule,
    PermisosModule,
    DependenciasModule,
    AuditoriaModule,
    HealthModule,
    IntegracionesModule,
  ],
})
export class AppModule {}
