from docx import Document
from pathlib import Path
from docx.oxml.ns import qn

path = Path(r'C:\Users\MONITORES\Documents\Software Monitorias\output\Levantamiento_Preliminar_Inventarios_Salas_Informatica.docx')
doc = Document(path)

def set_text(p, text):
    for r in p.runs: r.text = ''
    if p.runs: p.runs[0].text = text
    else: p.add_run(text)

# Remove CSV row from quality findings table (the table whose first column is Prioridad).
for table in doc.tables:
    if table.rows and table.rows[0].cells[0].text.strip() == 'Prioridad':
        for row in list(table.rows)[1:]:
            if 'CSV' in row.cells[1].text or 'CSV' in row.cells[0].text:
                table._tbl.remove(row._tr)

# Make the functional and non-functional requirements explicitly suggested.
for p in doc.paragraphs:
    if p.text.strip() == '7 Requerimientos funcionales preliminares':
        set_text(p, '7 Requerimientos funcionales sugeridos')
    elif p.text.strip() == '10 Requerimientos no funcionales':
        set_text(p, '10 Requerimientos no funcionales sugeridos')

for table in doc.tables:
    if table.rows and table.rows[0].cells[0].text.strip() == 'Área':
        if table.rows[0].cells[1].text.strip() == 'Requerimiento preliminar':
            table.rows[0].cells[1].text = 'Requerimiento sugerido'

# Strengthen the preliminary business rules without introducing an internal technical ID.
rule_texts = {
    'Un código de inventario no puede convertirse a número, notación científica ni valor de punto flotante durante importaciones, almacenamiento o exportaciones.':
        'El código de inventario debe conservarse como texto desde la captura hasta la exportación, incluyendo ceros iniciales, guiones, letras y longitud original. No se permite conversión automática a número, notación científica, truncamiento ni redondeo.',
    'Un equipo puede tener muchos mantenimientos, documentos, imágenes y movimientos de ubicación.':
        'Un equipo puede tener cero, uno o varios mantenimientos, documentos, imágenes y movimientos de ubicación. Cada evento debe conservar fecha, responsable, origen y estado cuando esos datos existan en la fuente.',
    'Un mantenimiento no realizado debe tener estado y motivo; la fecha realizada puede permanecer vacía.':
        'Un mantenimiento no realizado debe registrarse con estado explícito y motivo obligatorio. La fecha de ejecución solo puede diligenciarse cuando el mantenimiento haya sido efectivamente realizado.',
    'Los catálogos deben distinguir un dato ausente, un dato no aplicable, un valor cero real y un dato pendiente de verificación.':
        'Los catálogos y formularios deben distinguir, mediante valores controlados, un dato ausente, no aplicable, cero real y pendiente de verificación; estos estados no deben mezclarse con texto libre.',
    'La eliminación física debe estar restringida. Las bajas y correcciones deben quedar auditadas.':
        'La eliminación física de registros debe estar restringida a personal autorizado. Las bajas, correcciones, inactivaciones y reactivaciones deben conservar usuario, fecha, motivo y valor anterior cuando aplique.',
    'Los cambios de la plantilla oficial no deben implementarse mediante cambios directos de usuarios operativos.':
        'La plantilla oficial LAI y Hoja de Vida no debe ser modificada por usuarios operativos. Toda modificación estructural requiere control de versión, justificación, aprobación formal y conservación de la versión anterior.',
    'Los registros importados que no coincidan con un equipo existente deben entrar a conciliación y conservar su fuente de origen.':
        'Todo registro importado que no coincida de forma verificable con un equipo existente debe pasar a una bandeja de conciliación, conservar la fuente, fecha y valores originales, y quedar pendiente de decisión antes de consolidarse.'
}
for p in doc.paragraphs:
    if p.text in rule_texts:
        set_text(p, rule_texts[p.text])

# Add two confirmed identification rules to the business-rule section before section 10.
insert_after = None
for p in doc.paragraphs:
    if p.text.strip() == '9 Reglas de negocio propuestas':
        insert_after = p
        break
if insert_after is not None:
    # Insert after existing rule paragraphs by adding before the next heading in the XML.
    next_heading = None
    for p in doc.paragraphs:
        if p.text.strip() == '10 Requerimientos no funcionales sugeridos':
            next_heading = p
            break
    if next_heading is not None:
        parent = next_heading._p.getparent()
        rules = [
            'La placa institucional puede repetirse en activos independientes. Una consulta por placa debe mostrar tipo de activo, serial, ubicación y contexto antes de permitir una modificación.',
            'CPU, monitor y demás periféricos identificables deben conservar su contexto documental individual, aunque se relacionen dentro de una misma sala o puesto de trabajo.',
            'Los formatos LAI y Hoja de Vida deben conservar los campos visibles de placa y serial exigidos por sus plantillas institucionales.'
        ]
        for text in reversed(rules):
            newp = next_heading.insert_paragraph_before(text)
            newp.style = doc.styles['Normal']

# Remove entire sections (heading through immediately before the next named heading), including tables.
def remove_range(start_text, end_text):
    body = doc._body._element
    start = end = None
    for p in doc.paragraphs:
        txt = p.text.strip()
        if txt == start_text: start = p._p
        if txt == end_text and start is not None and end is None: end = p._p
    if start is None: return
    collecting = False
    for el in list(body.iterchildren()):
        if el is start: collecting = True
        if collecting and el is not end:
            body.remove(el)
        if el is end: break

remove_range('8 Propuesta de modelo de datos', '9 Reglas de negocio propuestas')
remove_range('C.6 Integración con equipos y mantenimientos', 'C.7 Riesgos y decisiones pendientes')
remove_range('C.8 Recomendación de migración', 'Anexo D Decisiones confirmadas para el diseño')
remove_range('D.2 Ficha central y sincronización de formatos', 'D.3 Fuentes, alcance y conciliación')

# Correct D.3 statements and leave insumo opening balance pending validation.
for p in doc.paragraphs:
    if p.text.strip() == 'Los archivos por sala y año se consideran evidencia histórica. Ante diferencias, prevalece el dato con fecha más reciente.':
        set_text(p, 'Los archivos por sala y año se consideran evidencia histórica. Ante diferencias, debe realizarse una revisión rigurosa de los datos, su fecha, fuente, contexto y soportes antes de determinar cuál registro es válido.')
    elif p.text.strip() == 'Los activos prioritarios son CPU y monitor. También se contemplan teclados, pantallas interactivas, sillas, altavoces, video beam, tabletas y portátiles.':
        set_text(p, 'Los activos prioritarios son CPU y monitor. También se contemplan teclados, pantallas interactivas, sillas, altavoces, video beam, tabletas y portátiles; otros activos quedan sujetos a revisión del equipo de trabajo.')
    elif p.text.strip().startswith('El saldo actual validado de insumos será el saldo de apertura'):
        set_text(p, 'La definición del saldo de apertura de insumos queda pendiente de validación por el equipo de trabajo. Una vez validada, las actualizaciones deberán registrarse como entrada, salida, traslado o ajuste con cantidad numérica, fecha, responsable, motivo y ubicación.')

tmp = path.with_name(path.stem + '_tmp.docx')
doc.save(tmp)
tmp.replace(path)
print('updated')
