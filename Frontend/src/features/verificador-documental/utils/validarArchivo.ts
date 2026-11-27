import type { LimitesCarga } from "../types";
export const limitesIniciales: LimitesCarga = {
  maxArchivos: 20,
  maxArchivoBytes: 20 * 1024 * 1024,
  maxTotalBytes: 60 * 1024 * 1024,
  maxPaginasPorArchivo: 500,
};
export const formatoTamano = (bytes: number) => {
  const unidad = bytes < 1024 ? "B" : bytes < 1024 * 1024 ? "KB" : "MB";
  const divisor = unidad === "B" ? 1 : unidad === "KB" ? 1024 : 1024 * 1024;
  return `${(bytes / divisor).toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${unidad}`;
};
export async function validarArchivo(
  archivo: File,
  limites: LimitesCarga,
): Promise<string> {
  if (!/\.pdf$/i.test(archivo.name))
    throw new Error("La extensión debe ser .pdf.");
  if (
    archivo.name.length > 255 ||
    Array.from(archivo.name).some((c) => c.charCodeAt(0) < 32)
  )
    throw new Error(
      "El nombre de archivo no es válido (máximo 255 caracteres).",
    );
  if (
    !["application/pdf", "application/octet-stream", ""].includes(
      archivo.type.toLowerCase(),
    )
  )
    throw new Error("El tipo de archivo no corresponde a PDF.");
  if (!archivo.size) throw new Error("El archivo está vacío.");
  if (archivo.size > limites.maxArchivoBytes)
    throw new Error(
      `Supera el límite de ${formatoTamano(limites.maxArchivoBytes)} por archivo.`,
    );
  const bytes = await archivo.arrayBuffer();
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
  const tail = new TextDecoder("latin1").decode(bytes.slice(-1024));
  if (
    !/^%PDF-\d\.\d/.test(header) ||
    !/%%EOF\s*$/.test(tail.replaceAll(String.fromCharCode(0), ""))
  )
    throw new Error("El contenido no corresponde a un PDF completo.");
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
