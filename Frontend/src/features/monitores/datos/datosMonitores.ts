import type { AnotacionMonitor, ExcepcionHorario, HorarioMonitor, Monitor, RegistroConciliacion, RegistroCrudo, ResumenMonitor, SesionMonitor } from "@/features/monitores/tipos/modelosMonitores";

export const monitores: Monitor[] = [
  { id:"mon-01", nombre:"Kaleth Molina", codigo:"20211001001", dependencia:"Aulas de Software", correo:"kmolina@udistrital.edu.co" },
  { id:"mon-02", nombre:"Sandra Ramírez", codigo:"20211001002", dependencia:"Aulas de Software", correo:"sramirez@udistrital.edu.co" },
  { id:"mon-03", nombre:"Iván Prado", codigo:"20202002003", dependencia:"Laboratorios de Ingeniería", correo:"iprado@udistrital.edu.co" },
  { id:"mon-04", nombre:"Laura Méndez", codigo:"20212003004", dependencia:"Laboratorios de Ingeniería", correo:"lmendez@udistrital.edu.co" },
  { id:"mon-05", nombre:"Daniela Ruiz", codigo:"20221004005", dependencia:"Soporte Tecnológico", correo:"druiz@udistrital.edu.co" },
  { id:"mon-06", nombre:"Mateo Vargas", codigo:"20211005006", dependencia:"Soporte Tecnológico", correo:"mvargas@udistrital.edu.co" },
  { id:"mon-07", nombre:"Camila Torres", codigo:"20222006007", dependencia:"Aulas de Software", correo:"ctorres@udistrital.edu.co" },
  { id:"mon-08", nombre:"Santiago León", codigo:"20202007008", dependencia:"Laboratorios de Ingeniería", correo:"sleon@udistrital.edu.co" },
];

export const resumenesIniciales: ResumenMonitor[] = monitores.map((monitor, index) => ({
  monitorId: monitor.id,
  horasNormales: 118 + index * 5,
  horasExtraAprobadas: index % 3 === 0 ? 8 : 4,
  horasExtraPendientes: index % 2 === 0 ? 3.5 : 0,
  horasAnotaciones: index % 4 === 0 ? -2 : index % 3 === 0 ? 2 : 0,
}));

export const sesionesIniciales: SesionMonitor[] = monitores.flatMap((monitor, monitorIndex) =>
  Array.from({ length: 4 }, (_, index) => ({
    id:`ses-${monitorIndex + 1}-${index + 1}`,
    monitorId:monitor.id,
    fecha:`2026-08-${String(24 - index).padStart(2,"0")}`,
    entrada:index === 1 ? "08:12:00" : "08:00:00",
    salida:index === 0 ? "14:30:00" : "14:00:00",
    horasNormales:6,
    horasExtra:index === 0 ? 0.5 : 0,
    horasRetraso:index === 1 ? 0.2 : 0,
    estadoExtra:index === 0 ? "PENDIENTE" : "NO_APLICA",
    retrasoExento:index === 2,
    excepcion:index === 2 ? "Semana institucional" : undefined,
  } as SesionMonitor)),
);

export const anotacionesIniciales: AnotacionMonitor[] = [
  { id:"ano-01", monitorId:"mon-01", fecha:"2026-08-24", tipo:"VIRTUAL", accion:"SUMAR", horas:2, motivo:"Apoyo remoto en actualización de inventario", responsable:"Carol Velasco" },
  { id:"ano-02", monitorId:"mon-03", fecha:"2026-08-23", tipo:"PERMISO", accion:"DESCONTAR", horas:1.5, motivo:"Salida anticipada autorizada", responsable:"Carol Velasco" },
  { id:"ano-03", monitorId:"mon-05", fecha:"2026-08-21", tipo:"CORRECCION", accion:"SUMAR", horas:1, motivo:"Corrección de marcación incompleta", responsable:"Jhon Rodríguez" },
  { id:"ano-04", monitorId:"mon-02", fecha:"2026-08-20", tipo:"OTRA", accion:"DESCONTAR", horas:0.5, motivo:"Ajuste administrativo", responsable:"Jhon Rodríguez" },
];

export const excepcionesIniciales: ExcepcionHorario[] = [
  { id:"exc-01", nombre:"Semana institucional", descripcion:"Actividades institucionales sin control de retraso.", fechaInicio:"2026-08-24", fechaFin:"2026-08-28", dependencia:"TODAS", ignorarRetrasos:true, aprobarHorasExtra:false, activa:true },
  { id:"exc-02", nombre:"Mantenimiento de laboratorios", descripcion:"Cambio temporal de turnos.", fechaInicio:"2026-09-02", fechaFin:"2026-09-04", dependencia:"Laboratorios de Ingeniería", ignorarRetrasos:true, aprobarHorasExtra:true, activa:true },
  { id:"exc-03", nombre:"Receso académico", descripcion:"Periodo sin actividad presencial.", fechaInicio:"2026-07-01", fechaFin:"2026-07-10", dependencia:"TODAS", ignorarRetrasos:true, aprobarHorasExtra:false, activa:false },
];

export const conciliacionesIniciales: RegistroConciliacion[] = [
  { id:"con-01", nombreOriginal:"KALETH  MOLINA", dependencia:"Aulas de Software", fecha:"2026-08-24", motivo:"Código no incluido en el archivo" },
  { id:"con-02", nombreOriginal:"S. RAMIREZ", dependencia:"Aulas de Software", fecha:"2026-08-23", motivo:"Coincidencia ambigua" },
  { id:"con-03", nombreOriginal:"IVAN PRADO LAB", dependencia:"Laboratorios de Ingeniería", fecha:"2026-08-22", motivo:"Nombre no coincide con el registro activo" },
  { id:"con-04", nombreOriginal:"DANIELA R.", dependencia:"Soporte Tecnológico", fecha:"2026-08-21", motivo:"Registro sin código estudiantil" },
];

export const horariosIniciales: HorarioMonitor[] = monitores.flatMap((monitor, index) => [
  { id:`hor-${index + 1}-1`, monitorId:monitor.id, dia:index % 2 ? "Martes" : "Lunes", horaInicio:"08:00", horaFin:"12:00", activo:true },
  { id:`hor-${index + 1}-2`, monitorId:monitor.id, dia:index % 2 ? "Jueves" : "Miércoles", horaInicio:"14:00", horaFin:"18:00", activo:true },
]);

export const registrosCrudosIniciales: RegistroCrudo[] = [
  { id:"raw-01", nombreOriginal:"KALETH MOLINA", dependencia:"Aulas de Software", fecha:"2026-08-24", estado:"CONCILIADO", monitorId:"mon-01" },
  { id:"raw-02", nombreOriginal:"S. RAMIREZ", dependencia:"Aulas de Software", fecha:"2026-08-24", estado:"PENDIENTE" },
  { id:"raw-03", nombreOriginal:"IVAN PRADO", dependencia:"Laboratorios de Ingeniería", fecha:"2026-08-23", estado:"CONCILIADO", monitorId:"mon-03" },
  { id:"raw-04", nombreOriginal:"LAURA MENDEZ", dependencia:"Laboratorios de Ingeniería", fecha:"2026-08-23", estado:"CONCILIADO", monitorId:"mon-04" },
  { id:"raw-05", nombreOriginal:"DANIELA R.", dependencia:"Soporte Tecnológico", fecha:"2026-08-22", estado:"PENDIENTE" },
  { id:"raw-06", nombreOriginal:"MATEO VARGAS", dependencia:"Soporte Tecnológico", fecha:"2026-08-22", estado:"CONCILIADO", monitorId:"mon-06" },
];

export const notificacionesIniciales = [
  { id:"not-01", titulo:"Importación pendiente", texto:"Hay 4 registros que requieren conciliación manual." },
  { id:"not-02", titulo:"Horas extra", texto:"Cuatro sesiones esperan decisión del líder." },
  { id:"not-03", titulo:"Cierre mensual", texto:"Faltan seis días para generar el reporte por dependencia." },
];
