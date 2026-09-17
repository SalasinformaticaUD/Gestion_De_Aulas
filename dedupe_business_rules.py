from docx import Document
from pathlib import Path

path = Path(r'C:\Users\MONITORES\Documents\Software Monitorias\output\Levantamiento_Preliminar_Inventarios_Salas_Informatica.docx')
doc = Document(path)
targets = [
    'Los formatos LAI y Hoja de Vida deben conservar los campos visibles de placa y serial exigidos por sus plantillas institucionales.',
    'CPU, monitor y demás periféricos identificables deben conservar su contexto documental individual, aunque se relacionen dentro de una misma sala o puesto de trabajo.',
    'La placa institucional puede repetirse en activos independientes. Una consulta por placa debe mostrar tipo de activo, serial, ubicación y contexto antes de permitir una modificación.'
]
seen = {t: 0 for t in targets}
for p in list(doc.paragraphs):
    if p.text in seen:
        seen[p.text] += 1
        if seen[p.text] > 1:
            p._element.getparent().remove(p._element)
tmp = path.with_name(path.stem + '_tmp.docx')
doc.save(tmp)
tmp.replace(path)
print('updated')
