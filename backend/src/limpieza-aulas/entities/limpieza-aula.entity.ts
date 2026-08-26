export class LimpiezaAula {
  id!: string;
  aulaId!: string;
  realizadaEn!: Date;
  observacion!: string | null;
  aula!: { id: string; codigo: string; ubicacion: string };
  responsable!: {
    id: string;
    nombreCompleto: string;
    nombreUsuario: string;
  } | null;
}

export class SugerenciaLimpiezaAula {
  aula!: { id: string; codigo: string; ubicacion: string };
  ultimaLimpieza!: Date | null;
  diasSinLimpieza!: number | null;
  limpiezasEnRango!: number;
  motivo!: string;
}
