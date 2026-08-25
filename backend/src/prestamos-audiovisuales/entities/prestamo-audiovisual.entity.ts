import type {
  Aula,
  Docente,
  PrestamoAudiovisual as PrismaPrestamoAudiovisual,
  Usuario,
} from '../../../generated/prisma/client.js';
import type { DetallePrestamoAudiovisualEntity } from './detalle-prestamo-audiovisual.entity';

type UsuarioPrestamoAudiovisual = Pick<Usuario, keyof Usuario>;

export class PrestamoAudiovisualEntity implements PrismaPrestamoAudiovisual {
  declare id: string;
  declare docenteId: string;
  declare aulaId: string;
  declare entregadoPorId: string | null;
  declare recibidoPorId: string | null;
  declare canceladoPorId: string | null;
  declare salidaEn: Date | null;
  declare devolucionEstimada: Date;
  declare devolucionReal: Date | null;
  declare canceladoEn: Date | null;
  declare motivoCancelacion: string | null;
  declare estado: PrismaPrestamoAudiovisual['estado'];
  declare docente?: Docente;
  declare aula?: Aula;
  declare entregadoPor?: UsuarioPrestamoAudiovisual | null;
  declare recibidoPor?: UsuarioPrestamoAudiovisual | null;
  declare canceladoPor?: UsuarioPrestamoAudiovisual | null;
  declare detalles?: DetallePrestamoAudiovisualEntity[];
}
