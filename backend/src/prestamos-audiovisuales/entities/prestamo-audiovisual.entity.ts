import type {
  Aula,
  Docente,
  PrestamoAudiovisual as PrismaPrestamoAudiovisual,
  Usuario,
  Prisma,
} from '@prisma/client';
import type { DetallePrestamoAudiovisualEntity } from './detalle-prestamo-audiovisual.entity';

type UsuarioPrestamoAudiovisual = Pick<Usuario, keyof Usuario>;

export class PrestamoAudiovisualEntity implements PrismaPrestamoAudiovisual {
  declare id: string;
  declare docenteId: string | null;
  declare aulaId: string | null;
  declare responsableTipo: string;
  declare docenteNombre: string;
  declare docenteDocumento: string;
  declare salonTexto: string;
  declare elementosAdicionales: Prisma.JsonValue | null;
  declare observacionesPrestamo: string | null;
  declare recibidoPorTipo: string | null;
  declare observacionesDevolucion: string | null;
  declare devolucionCompleta: boolean | null;
  declare entregadoPorId: string | null;
  declare recibidoPorId: string | null;
  declare canceladoPorId: string | null;
  declare salidaEn: Date | null;
  declare devolucionEstimada: Date;
  declare devolucionReal: Date | null;
  declare canceladoEn: Date | null;
  declare motivoCancelacion: string | null;
  declare estado: PrismaPrestamoAudiovisual['estado'];
  declare docente?: Docente | null;
  declare aula?: Aula | null;
  declare entregadoPor?: UsuarioPrestamoAudiovisual | null;
  declare recibidoPor?: UsuarioPrestamoAudiovisual | null;
  declare canceladoPor?: UsuarioPrestamoAudiovisual | null;
  declare detalles?: DetallePrestamoAudiovisualEntity[];
}
