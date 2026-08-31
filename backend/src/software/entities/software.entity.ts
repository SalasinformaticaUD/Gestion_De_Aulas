import type {
  Aula,
  AulaSoftware,
  Software as PrismaSoftware,
} from '@prisma/client';

export class SoftwareEntity implements PrismaSoftware {
  declare id: string;
  declare nombre: string;
  declare version: string;
  declare descripcion: string | null;
  declare aulas?: Array<AulaSoftware & { aula?: Aula }>;
}
