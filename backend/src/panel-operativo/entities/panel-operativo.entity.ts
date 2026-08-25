import { DisponibilidadAula } from '../../disponibilidad-aulas/entities/disponibilidad-aula.entity';

export type SeveridadAlertaOperativa = 'info' | 'advertencia' | 'critica';

export class AlertaOperativa {
  declare id: string;
  declare severidad: SeveridadAlertaOperativa;
  declare tipo: string;
  declare mensaje: string;
  declare aulaId?: string;
  declare origenId?: string;
}

export class PanelOperativoResumen {
  declare fecha: string;
  declare bloqueReferencia: { horaInicio: string; horaFin: string };
  declare metricas: {
    totalAulas: number;
    disponibles: number;
    ocupadas: number;
    reservadas: number;
    mantenimiento: number;
    bloqueadas: number;
    asistenciasPendientes: number;
    ausenciasDocentes: number;
    practicasActivas: number;
    prestamosDelDia: number;
    alertas: number;
  };
  declare alertas: AlertaOperativa[];
  declare calculadoEn: Date;
  declare persistido: false;
}

export class PaginaAulasPanelOperativo {
  declare fecha: string;
  declare bloqueReferencia: { horaInicio: string; horaFin: string };
  declare pagina: number;
  declare limite: number;
  declare total: number;
  declare items: DisponibilidadAula[];
  declare persistido: false;
}
