import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MonitoresEstadoDto } from './dto/monitores-estado.dto';
import { MonitorUsuarioDto } from './dto/monitor-usuario.dto';

type EstadoRemoto = { status?: unknown; detalle?: unknown };
type UsuarioRemoto = {
  id?: unknown;
  usuarioExternoId?: unknown;
  nombre?: unknown;
  estado?: unknown;
};

@Injectable()
export class MonitoresClientService {
  async estado(): Promise<MonitoresEstadoDto> {
    const response = await this.request('/health');
    const data = await this.json<EstadoRemoto>(response);
    return {
      disponible: true,
      servicio: 'monitores',
      detalle:
        typeof data.status === 'string'
          ? data.status
          : 'API de Monitores disponible.',
    };
  }

  async buscarUsuario(usuarioExternoId: string): Promise<MonitorUsuarioDto> {
    const response = await this.request(
      `/usuarios/${encodeURIComponent(usuarioExternoId)}`,
    );
    if (response.status === 404) {
      return {
        usuarioExternoId,
        existe: false,
        monitorId: null,
        nombre: null,
        estado: null,
      };
    }
    const data = await this.json<UsuarioRemoto>(response);
    return {
      usuarioExternoId:
        typeof data.usuarioExternoId === 'string'
          ? data.usuarioExternoId
          : usuarioExternoId,
      existe: true,
      monitorId: typeof data.id === 'string' ? data.id : null,
      nombre: typeof data.nombre === 'string' ? data.nombre : null,
      estado: typeof data.estado === 'string' ? data.estado : null,
    };
  }

  private async request(path: string): Promise<Response> {
    const baseUrl = process.env.MONITORES_API_URL?.trim();
    if (!baseUrl)
      throw new ServiceUnavailableException(
        'MONITORES_API_URL no está configurada.',
      );
    const timeout = Number(process.env.MONITORES_API_TIMEOUT_MS ?? 5000);
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
        signal: AbortSignal.timeout(
          Number.isFinite(timeout) && timeout > 0 ? timeout : 5000,
        ),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok && response.status !== 404) {
        throw new BadGatewayException(
          `La API de Monitores respondió ${response.status}.`,
        );
      }
      return response;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible comunicarse con la API de Monitores.',
      );
    }
  }

  private async json<T>(response: Response): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch {
      throw new BadGatewayException(
        'La API de Monitores no devolvió JSON válido.',
      );
    }
  }
}
