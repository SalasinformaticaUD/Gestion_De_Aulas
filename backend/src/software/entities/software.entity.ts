import type {
  Aula,
  AulaSoftware,
  Software as PrismaSoftware,
} from '../../../generated/prisma/client.js';

export class SoftwareEntity implements PrismaSoftware {
  declare id: string;
  declare nombre: string;
  declare version: string;
  declare descripcion: string | null;
  declare aulas?: Array<AulaSoftware & { aula?: Aula }>;
}
