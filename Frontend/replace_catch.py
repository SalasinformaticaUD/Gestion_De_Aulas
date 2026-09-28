import re

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/GestionInconsistencias.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the catch block
old_catch = """      } catch (error) {
        setAviso(
          error instanceof Error && error.message.includes("sesion procesada")
            ? "La marcaci\u00f3n ya gener\u00f3 una sesi\u00f3n. Debe invalidar la sesi\u00f3n derivada antes de rechazar este registro."
            : error instanceof Error
              ? error.message
              : "No fue posible actualizar la inconsistencia.",
        );
      } finally {"""

new_catch = """      } catch (error) {
        if (error instanceof Error && error.message.includes("sesion procesada")) {
             try {
                 const dt = await servicioMonitores.obtenerInconsistencia(item.id);
                 if (dt.work_session) {
                     await servicioMonitores.invalidarSesion(dt.work_session.id, descripcion);
                     setAviso("Se invalidó automáticamente la sesión derivada.");
                     setModalAccion(null);
                     setDetalle(null);
                     await recargarTodo();
                     return;
                 }
             } catch (e) {
                 console.error("Error al invalidar sesión derivada", e);
             }
             setAviso("La marcación ya generó una sesión. Debe invalidar la sesión derivada manualmente.");
        } else {
             setAviso(
               error instanceof Error
                 ? error.message
                 : "No fue posible actualizar la inconsistencia.",
             );
        }
      } finally {"""

# Replace using literal strings
content = content.replace(old_catch, new_catch)
# If it failed, try another string pattern
if new_catch not in content:
    # use regex
    pattern = r'\} catch \(error\) \{[\s\S]*?\} finally \{'
    content = re.sub(pattern, new_catch, content)

with open('c:/Users/ACER/Documents/Software Monitorias/Frontend/src/features/monitores/componentes/GestionInconsistencias.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Catch block updated!')
