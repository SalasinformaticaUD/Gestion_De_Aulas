import { Injectable, Logger } from '@nestjs/common';

type ConfirmacionPractica = {
  correo: string | null;
  estudiante: string;
  aula: string;
  software: string;
  inicio: Date;
  fin: Date;
};

@Injectable()
export class PracticasLibresEmailService {
  private readonly logger = new Logger(PracticasLibresEmailService.name);

  async enviarConfirmacion(datos: ConfirmacionPractica): Promise<{ enviado: boolean; motivo?: string }> {
    if (!datos.correo) return { enviado: false, motivo: 'El estudiante no tiene correo registrado.' };
    const webhook = process.env.EMAIL_WEBHOOK_URL?.trim();
    if (!webhook) {
      this.logger.warn(`No se envió confirmación a ${datos.correo}: EMAIL_WEBHOOK_URL no está configurado.`);
      return { enviado: false, motivo: 'El servicio de correo no está configurado.' };
    }

    const contenido = [
      `Hola ${datos.estudiante},`,
      '',
      `Su práctica libre fue confirmada en el aula ${datos.aula}.`,
      `Software solicitado: ${datos.software}.`,
      `Inicio: ${datos.inicio.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}.`,
      `Fin estimado: ${datos.fin.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}.`,
      '',
      'Reglas de uso: cuide los equipos, use únicamente el software autorizado, respete el horario y reporte cualquier novedad al responsable. El incumplimiento puede generar una multa.',
    ].join('\n');
    const respuesta = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: datos.correo, subject: 'Confirmación de práctica libre', text: contenido }),
    });
    if (!respuesta.ok) {
      this.logger.error(`El servicio de correo rechazó la confirmación para ${datos.correo}.`);
      return { enviado: false, motivo: 'El servicio de correo rechazó la solicitud.' };
    }
    return { enviado: true };
  }
}
