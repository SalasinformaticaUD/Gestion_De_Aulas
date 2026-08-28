# Renderizador de reportes XLSX

Servicio FastAPI interno. Rellena una copia temporal de la plantilla Excel
modificando únicamente el XML de las celdas y la convierte a PDF utilizando
LibreOffice en modo headless. Esto conserva las imágenes y dibujos originales del XLSX.

## Instalación en Windows

```powershell
cd backend\python-renderer
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:SOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

El backend NestJS debe tener `PDF_RENDERER_URL=http://127.0.0.1:8001`.
