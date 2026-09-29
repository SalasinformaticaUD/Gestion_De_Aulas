# Integración con Microsoft Forms

## Endpoint

```text
POST /integraciones/forms/solicitudes-instalacion
```

La petición no utiliza la sesión de un usuario. Debe incluir una clave exclusiva
para Power Automate:

```text
Content-Type: application/json
x-integration-key: <FORMS_INTEGRATION_KEY>
```

`FORMS_INTEGRATION_KEY` debe ser un secreto aleatorio de al menos 32 caracteres
y debe configurarse tanto en el backend como en la conexión de Power Automate.

## Cuerpo

El cuerpo corresponde a la salida de la acción **Construir solicitud para la
aplicación**. Los campos de aulas pueden llegar como un arreglo serializado en
texto, por ejemplo `"[\"Aula 306\",\"Aula 311\"]"`, o como texto libre.

El backend:

1. valida el DTO y la fecha ISO;
2. extrae códigos de aula de tres dígitos;
3. convierte el proyecto curricular a mayúsculas;
4. conserva asignaturas y software como texto;
5. aplica la clasificación entre peticiones actuales e historial;
6. reutiliza la normalización y la detección de duplicados del Excel;
7. usa `responseId` para responder de forma segura ante reintentos.

## Respuesta

Cuando se crea una solicitud:

```json
{
  "procesada": true,
  "creada": true,
  "motivo": null,
  "importacionId": "uuid",
  "solicitudId": "uuid",
  "estado": "PENDIENTE_REVISION",
  "historica": false
}
```

Un reintento del mismo `responseId` devuelve `RESPUESTA_YA_PROCESADA`. Una
respuesta diferente con el mismo docente y contenido devuelve
`SOLICITUD_DUPLICADA`. Ambos casos responden correctamente y no crean otra
petición.
