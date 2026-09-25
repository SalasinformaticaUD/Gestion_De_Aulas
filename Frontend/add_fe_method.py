import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/api/servicioMonitores.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add invalidarSesion to the service
new_method = """  invalidarSesion: (id:string, reason:string) => solicitarMonitores<SesionApi>(`/api/v1/work-sessions/${id}/invalidate/`, { method:"POST", body:JSON.stringify({ reason }) }),"""

content = content.replace('  invalidarInconsistencia:', new_method + '\n  invalidarInconsistencia:')

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/api/servicioMonitores.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('Method added to frontend!')
