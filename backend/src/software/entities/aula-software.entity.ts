import type {
  Aula,
  AulaSoftware as PrismaAulaSoftware,
  Software,
} from '../../../generated/prisma/client.js';

export class AulaSoftwareEntity implements PrismaAulaSoftware {
  declare aulaId: string;
  declare softwareId: string;
  declare instaladoEn: Date;
  declare aula?: Aula;
  declare software?: Software;
}
