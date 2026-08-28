from __future__ import annotations

import os
import posixpath
import shutil
import subprocess
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES = Path(os.getenv("REPORT_TEMPLATES_DIR", str(ROOT / "templates" / "reportes"))).resolve()
PLANTILLAS = {
    "SIGUD.xlsx": "SIGUD",
    "Ficha - Practicas libres.xlsx": "Ficha - PracticasLibres",
    "Ficha SIGUD audiovisuales.xlsx": "Ficha - SIGUD Audiovisuales",
}


class RenderRequest(BaseModel):
    plantilla: Literal[
        "SIGUD.xlsx",
        "Ficha - Practicas libres.xlsx",
        "Ficha SIGUD audiovisuales.xlsx",
    ]
    valores: dict[str, str] = Field(default_factory=dict)
    nombreArchivo: str = "reporte"


app = FastAPI(title="Renderizador de reportes XLSX", version="1.0.0")

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
ET.register_namespace("", MAIN_NS)


def qname(namespace: str, name: str) -> str:
    return f"{{{namespace}}}{name}"


def target_values(template_name: str, values: dict[str, str]) -> dict[str, str]:
    if template_name == "SIGUD.xlsx":
        return {
            key: value
            for key, value in values.items()
            if key in {"F8", "H8", "J8"}
            or key[:1] in {"G", "J", "M", "P", "S", "V", "Y"}
            or key.startswith("AB")
        }
    if template_name == "Ficha - Practicas libres.xlsx":
        keys = (
            "B10", "G10", "B12", "G12", "B16", "C16", "D16", "E16",
            "F16", "I16", "B20", "C20", "H20", "I20", "J20", "B25", "B26", "G26", "G28",
        )
        return {key: values.get(key, "") for key in keys}
    keys = (
        "D6", "E6", "F6", "C8", "F8", "C9", "C10", "C11",
        "C13", "C14", "C15", "C17", "C21",
    )
    return {key: values.get(key, "") for key in keys}


def sheet_entry(archive: zipfile.ZipFile, expected: str) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rel_targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in relationships.findall(qname(PKG_REL_NS, "Relationship"))
    }
    normalized = expected.lower().replace(" ", "").replace("-", "")
    selected = None
    for sheet in workbook.find(qname(MAIN_NS, "sheets")):
        name = sheet.attrib.get("name", "")
        candidate = name.lower().replace(" ", "").replace("-", "")
        if candidate == normalized:
            selected = sheet
            break
    if selected is None:
        selected = next(iter(workbook.find(qname(MAIN_NS, "sheets"))))
    target = rel_targets[selected.attrib[f"{{{REL_NS}}}id"]]
    return posixpath.normpath(posixpath.join("xl", target.lstrip("/")))


def set_cells_in_xlsx(source: Path, destination: Path, template_name: str, values: dict[str, str]) -> None:
    # Edita únicamente XML de celdas: así se preservan sin reserializar las
    # imágenes, dibujos, relaciones y estilos originales del archivo XLSX.
    targets = target_values(template_name, values)
    with zipfile.ZipFile(source, "r") as reader:
        sheet_path = sheet_entry(reader, PLANTILLAS[template_name])
        sheet_xml = ET.fromstring(reader.read(sheet_path))
        cells = {
            cell.attrib.get("r"): cell
            for cell in sheet_xml.iter(qname(MAIN_NS, "c"))
        }
        for reference, value in targets.items():
            cell = cells.get(reference)
            if cell is None:
                raise RuntimeError(f"La celda {reference} no existe en la plantilla Excel.")
            for child in list(cell):
                cell.remove(child)
            cell.set("t", "inlineStr")
            inline = ET.SubElement(cell, qname(MAIN_NS, "is"))
            text = ET.SubElement(inline, qname(MAIN_NS, "t"))
            text.text = str(value or "")
            if text.text[:1].isspace() or text.text[-1:].isspace():
                text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        rendered_sheet = ET.tostring(sheet_xml, encoding="utf-8", xml_declaration=True)
        with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as writer:
            for item in reader.infolist():
                data = rendered_sheet if item.filename == sheet_path else reader.read(item.filename)
                writer.writestr(item, data)

def soffice_path() -> str:
    configured = os.getenv("SOFFICE_PATH", "").strip()
    candidates = [
        configured,
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "soffice.exe",
        "libreoffice.exe",
    ]
    for candidate in candidates:
        if candidate and (Path(candidate).exists() or shutil.which(candidate)):
            return candidate
    raise RuntimeError("No se encontró LibreOffice. Configure SOFFICE_PATH.")


@app.get("/health")
def health():
    return {"status": "ok", "templates": str(TEMPLATES)}


@app.post("/render/xlsx")
def render_xlsx(request: RenderRequest):
    template = TEMPLATES / request.plantilla
    if not template.is_file():
        raise HTTPException(status_code=404, detail=f"No existe la plantilla: {template}")
    try:
        with tempfile.TemporaryDirectory(prefix="sgoas-render-") as workdir:
            work = Path(workdir)
            source = work / "plantilla-original.xlsx"
            filled = work / "relleno.xlsx"
            output = work / "pdf"
            profile = work / "libreoffice-profile"
            output.mkdir()
            shutil.copy2(template, source)
            set_cells_in_xlsx(source, filled, request.plantilla, request.valores)
            source = filled
            command = [
                soffice_path(),
                f"-env:UserInstallation={profile.as_uri()}",
                "--headless", "--nologo", "--nodefault", "--nofirststartwizard",
                "--convert-to", "pdf", "--outdir", str(output), str(source),
            ]
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=int(os.getenv("SOFFICE_TIMEOUT_SECONDS", "90")),
                check=False,
            )
            pdf = output / "relleno.pdf"
            if completed.returncode != 0 or not pdf.is_file():
                detail = (completed.stderr or completed.stdout or "sin detalle").strip()
                raise RuntimeError(f"LibreOffice no convirtió la plantilla: {detail}")
            content = pdf.read_bytes()
        safe_name = Path(request.nombreArchivo).name.replace('"', "") or "reporte"
        if not safe_name.lower().endswith(".pdf"):
            safe_name += ".pdf"
        return Response(
            content=content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}"',
                "Content-Length": str(len(content)),
            },
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
