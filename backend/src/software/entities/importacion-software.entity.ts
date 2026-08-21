import type {
  ImportacionSoftware as PrismaImportacionSoftware,
  Usuario,
} from '../../../generated/prisma/client.js';

export class ImportacionSoftwareEntity implements PrismaImportacionSoftware {
  declare id: string;
  declare usuarioId: string | null;
  declare nombreArchivo: string | null;
  declare totalRegistros: number;
  declare registrosProcesados: number;
  declare registrosConError: number;
  declare resultado: PrismaImportacionSoftware['resultado'];
  declare errores: PrismaImportacionSoftware['errores'];
  declare creadoEn: Date;
  declare usuario?: Usuario | null;
}
