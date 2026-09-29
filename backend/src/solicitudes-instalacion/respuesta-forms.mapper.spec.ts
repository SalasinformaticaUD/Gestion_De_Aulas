import type { ImportarRespuestaFormsDto } from './dto/importar-respuesta-forms.dto';
import { convertirRespuestaForms } from './respuesta-forms.mapper';

describe('convertirRespuestaForms', () => {
  it('convierte el DTO real de Power Automate sin duplicar aulas', () => {
    const dto: ImportarRespuestaFormsDto = {
      responseId: '315',
      fechaRecepcion: '2026-09-29T16:18:29.3205086Z',
      correoRespondiente: 'Prueba@gmail.com',
      nombreRespondiente: 'prueba',
      docenteNombre: 'prueba',
      docenteCorreo: 'Prueba@gmail.com',
      proyectoCurricular: 'Ingeniería Industrial',
      aulasSeleccionadas: '["Aula 306","Aula 311"]',
      aulasEscritas: '["Aula 306","Aula 311"]',
      asignatura1: '',
      software1: '',
      continuar2: '',
      asignatura2: '',
      software2: 'PRUEBA',
      observacion2: '',
      continuar3: '',
      asignatura3: '',
      software3: '',
      observacion3: '',
      continuar4: '',
      asignatura4: '',
      software4: '',
      observacion4: '',
      continuar5: '',
      asignatura5: 'prueba',
      software5: '',
      observacion5: 'prueba',
      observacionGeneral: '',
    };

    const solicitud = convertirRespuestaForms(dto);

    expect(solicitud.identificadorOrigen).toBe('FORMS:315');
    expect(solicitud.proyectoCurricularOriginal).toBe('INGENIERÍA INDUSTRIAL');
    expect(solicitud.historicaAlImportar).toBe(false);
    expect(solicitud.items).toHaveLength(2);
    expect(solicitud.items[0]).toMatchObject({
      posicion: 2,
      asignaturaOriginal: null,
      aulasOriginales: ['306', '311'],
      software: [{ posicion: 1, nombreOriginal: 'PRUEBA' }],
    });
    expect(solicitud.items[1]).toMatchObject({
      posicion: 5,
      asignaturaOriginal: 'prueba',
      aulasOriginales: ['306', '311'],
      software: [],
    });
    expect(solicitud.alertas).toEqual(
      expect.arrayContaining([
        'El ítem 2 no tiene asignatura.',
        'El ítem 5 no tiene software.',
      ]),
    );
  });

  it('acepta aulas escritas sin formato JSON', () => {
    const solicitud = convertirRespuestaForms({
      responseId: '316',
      fechaRecepcion: '2026-09-29T16:18:29Z',
      correoRespondiente: '',
      nombreRespondiente: '',
      docenteNombre: 'Docente',
      docenteCorreo: 'docente@udistrital.edu.co',
      proyectoCurricular: 'Ingeniería de Sistemas',
      aulasSeleccionadas: '',
      aulasEscritas: 'Laboratorios 405, 406 y edificio 1234',
      asignatura1: 'Bases de datos',
      software1: 'PostgreSQL',
    });

    expect(solicitud.items[0].aulasOriginales).toEqual(['405', '406']);
  });
});
