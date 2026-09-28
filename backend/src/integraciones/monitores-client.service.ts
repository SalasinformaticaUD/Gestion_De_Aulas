import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MonitoresEstadoDto } from './dto/monitores-estado.dto';
import { MonitorUsuarioDto } from './dto/monitor-usuario.dto';

type EstadoRemoto = { status?: unknown; detalle?: unknown };
type UsuarioRemoto = { id?: unknown; usuarioExternoId?: unknown; nombre?: unknown; estado?: unknown };
type ErrorRemoto = { detail?: unknown; message?: unknown; [key: string]: unknown };

export type UsuarioMonitoresSincronizado = {
  externalUserId: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'LIDER' | null;
  department?: 'PHYSICS' | 'INFORMATICS_LABS' | 'ELECTRICAL';
  isActive: boolean;
};

const departamentosRemotos = {
  PHYSICS: 'physics',
  INFORMATICS_LABS: 'informatics_labs',
  ELECTRICAL: 'electrical',
} as const;

@Injectable()
export class MonitoresClientService {
  async estado(): Promise<MonitoresEstadoDto> {
    const response = await this.request('/health');
    const data = await this.json<EstadoRemoto>(response);
    return { disponible: true, servicio: 'monitores', detalle: typeof data.status === 'string' ? data.status : 'API de Monitores disponible.' };
  }

  async buscarUsuario(usuarioExternoId: string): Promise<MonitorUsuarioDto> {
    const response = await this.request(`/usuarios/${encodeURIComponent(usuarioExternoId)}`);
    if (response.status === 404) return { usuarioExternoId, existe: false, monitorId: null, nombre: null, estado: null };
    const data = await this.json<UsuarioRemoto>(response);
    return {
      usuarioExternoId: typeof data.usuarioExternoId === 'string' ? data.usuarioExternoId : usuarioExternoId,
      existe: true,
      monitorId: typeof data.id === 'string' ? data.id : null,
      nombre: typeof data.nombre === 'string' ? data.nombre : null,
      estado: typeof data.estado === 'string' ? data.estado : null,
    };
  }

  async sincronizarUsuario(usuario: UsuarioMonitoresSincronizado): Promise<void> {
    const role = usuario.role === 'ADMIN' ? 'admin' : usuario.role === 'LIDER' ? 'leader' : null;
    const department = usuario.role === 'LIDER' && usuario.department ? departamentosRemotos[usuario.department] : null;
    const response = await this.request('/api/v1/platform/users/sync/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Monitores-Service-Token': this.serviceToken() },
      body: JSON.stringify({
        external_user_id: usuario.externalUserId,
        username: usuario.username,
        email: usuario.email,
        full_name: usuario.fullName,
        role,
        department,
        is_active: usuario.isActive,
      }),
    });
    await this.json<Record<string, unknown>>(response);
  }

  private serviceToken() {
    const token = process.env.MONITORES_SERVICE_TOKEN?.trim();
    if (!token) throw new ServiceUnavailableException('MONITORES_SERVICE_TOKEN no está configurado.');
    return token;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const baseUrl = process.env.MONITORES_API_URL?.trim();
    if (!baseUrl) throw new ServiceUnavailableException('MONITORES_API_URL no está configurada.');
    const timeout = Number(process.env.MONITORES_API_TIMEOUT_MS ?? 5000);
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
        signal: AbortSignal.timeout(Number.isFinite(timeout) && timeout > 0 ? timeout : 5000),
        ...init,
        headers: { Accept: 'application/json', ...init.headers },
      });
      if (!response.ok && response.status !== 404) {
        const detalle = await this.detalleError(response);
        throw new BadGatewayException(`La API de Monitores respondió ${response.status}${detalle ? `: ${detalle}` : '.'}`);
      }
      return response;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new ServiceUnavailableException('No fue posible comunicarse con la API de Monitores.');
    }
  }

  private async detalleError(response: Response): Promise<string | null> {
    try {
      const data = await response.json() as ErrorRemoto;
      const value = data.detail ?? data.message ?? Object.values(data).flat().find((item) => typeof item === 'string');
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  private async json<T>(response: Response): Promise<T> {
    try { return await response.json() as T; }
    catch { throw new BadGatewayException('La API de Monitores no devolvió JSON válido.'); }
  }
}