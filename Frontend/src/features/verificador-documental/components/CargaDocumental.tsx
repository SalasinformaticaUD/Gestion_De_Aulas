"use client";
import { useRef } from "react";
import type {
  ArchivoSeleccionado,
  EstadoCarga,
  LimitesCarga,
  ModalidadCarga,
} from "../types";
import { formatoTamano } from "../utils/validarArchivo";
import styles from "./VerificadorDocumentalView.module.css";

export function CargaDocumental({
  archivos,
  modalidad,
  limites,
  bloqueado,
  estado,
  porcentaje,
  errorLote,
  onAgregar,
  onEliminar,
}: {
  archivos: ArchivoSeleccionado[];
  modalidad: ModalidadCarga;
  limites: LimitesCarga;
  bloqueado: boolean;
  estado: EstadoCarga;
  porcentaje: number;
  errorLote: string;
  onAgregar: (files: File[]) => void;
  onEliminar: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const total = archivos.reduce((sum, item) => sum + item.archivo.size, 0);
  const activo = ["CREANDO", "SUBIENDO", "PROCESANDO"].includes(estado);
  return (
    <section
      className={`${styles.wide} ${styles.uploadSection}`}
      aria-label="Carga documental"
      aria-busy={activo}
    >
      <div>
        <h2>Documentación del contratista</h2>
        <p className={styles.muted}>
          {modalidad === "PDF_UNIFICADO"
            ? "Seleccione un PDF con toda la documentación."
            : "Agregue los PDF individuales. Puede seleccionarlos en varias tandas."}
        </p>
      </div>
      <div
        className={styles.dropzone}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!bloqueado) onAgregar(Array.from(event.dataTransfer.files));
        }}
      >
        <span className={styles.uploadIcon} aria-hidden="true">
          ↑
        </span>
        <strong>Arrastre sus PDF aquí</strong>
        <span>o selecciónelos desde su equipo</span>
        <button
          type="button"
          disabled={bloqueado}
          onClick={() => input.current?.click()}
        >
          {modalidad === "PDF_UNIFICADO" ? "Seleccionar PDF" : "Agregar PDF"}
        </button>
        <input
          ref={input}
          type="file"
          accept=".pdf,application/pdf"
          multiple={modalidad === "PDF_SEPARADOS"}
          disabled={bloqueado}
          aria-label="Seleccionar archivos PDF"
          className="sr-only"
          onChange={(event) => {
            onAgregar(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <small>
          Hasta {formatoTamano(limites.maxArchivoBytes)} por PDF ·{" "}
          {formatoTamano(limites.maxTotalBytes)} en total ·{" "}
          {modalidad === "PDF_UNIFICADO"
            ? "1 archivo"
            : `máximo ${limites.maxArchivos} archivos`}
        </small>
      </div>
      {errorLote && (
        <p role="alert" className={styles.error}>
          {errorLote}
        </p>
      )}
      {archivos.length > 0 && (
        <>
          <div className={styles.fileSummary}>
            <strong>{archivos.length} archivo(s) seleccionado(s)</strong>
            <span>{formatoTamano(total)}</span>
          </div>
          <ul className={styles.fileList}>
            {archivos.map((item) => (
              <li key={item.id}>
                <div className={styles.fileDescription}>
                  <strong>{item.archivo.name}</strong>
                  <small>{formatoTamano(item.archivo.size)}</small>
                  <span
                    className={
                      item.estado === "ERROR" ? styles.error : styles.muted
                    }
                  >
                    {item.estado === "VALIDANDO"
                      ? "Comprobando archivo..."
                      : item.estado === "ERROR"
                        ? item.error
                        : "Listo para enviar · el servidor comprobará su estructura"}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => onEliminar(item.id)}
                  aria-label={`Eliminar ${item.archivo.name}`}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {activo && (
        <div className={styles.processing} role="status" aria-live="polite">
          <strong>
            {estado === "CREANDO"
              ? "Preparando la verificación..."
              : estado === "SUBIENDO"
                ? `Cargando archivos: ${porcentaje}%`
                : "Comparando datos y validando cada documento..."}
          </strong>
          {estado === "SUBIENDO" ? (
            <progress
              value={porcentaje}
              max={100}
              aria-label="Progreso de carga"
            />
          ) : (
            <progress aria-label="Procesamiento en curso" />
          )}
          <span>Espere a que termine antes de cerrar esta pantalla.</span>
        </div>
      )}
    </section>
  );
}
