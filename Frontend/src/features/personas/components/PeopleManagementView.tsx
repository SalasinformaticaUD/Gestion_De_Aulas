"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { actualizarPersona, crearPersona, eliminarPersona, importarDocentesExcel, importarEstudiantesExcel, listarPersonasPaginadas, type Pagina, type Persona } from "../api/personasApi";
import styles from "./PeopleManagementView.module.css";

type Tipo = "estudiantes" | "docentes";
type Notice = { error: boolean; text: string };
const titles: Record<Tipo, { plural: string; singular: string; identifier: string }> = {
  estudiantes: { plural: "Estudiantes", singular: "estudiante", identifier: "Código estudiantil" },
  docentes: { plural: "Docentes", singular: "docente", identifier: "ID" },
};
const emptyForm = { identificacion: "", nombre: "", correo: "", proyecto: "" };

export function PeopleManagementView({ tipo }: { tipo: Tipo }) {
  const [items, setItems] = useState<Persona[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Pagina<Persona>["meta"]>({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [editing, setEditing] = useState<Persona | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, Pagina<Persona>>());
  const content = titles[tipo];
  const isStudent = tipo === "estudiantes";

  const load = useCallback(async (targetPage = page, force = false) => {
    const key = `${tipo}:${targetPage}:${query.trim().toLowerCase()}`;
    try {
      const result = !force && cache.current.get(key) || await listarPersonasPaginadas(tipo, targetPage, query);
      if (!cache.current.has(key) || force) cache.current.set(key, result);
      setItems(result.data); setMeta(result.meta);
    } catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : "No fue posible cargar los registros." }); }
  }, [page, query, tipo]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 15000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const invalidate = () => { cache.current.clear(); };

  const reset = () => { setEditing(null); setForm(emptyForm); setFormError(null); };
  const closeModal = () => { reset(); setIsFormModalOpen(false); };
  const openCreate = () => { reset(); setIsFormModalOpen(true); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setFormError(null);
    if (!/^\d{3,50}$/.test(form.identificacion.trim())) { setFormError(content.identifier + " debe contener únicamente números."); return; }
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{3,160}$/.test(form.nombre.trim())) { setFormError("El nombre debe contener únicamente letras y espacios."); return; }
    if (!isStudent && !form.proyecto.trim()) { setFormError("El proyecto es obligatorio."); return; }
    const data = isStudent
      ? { codigo: form.identificacion.trim(), nombre: form.nombre.trim(), correo: form.correo.trim() || undefined }
      : { documento: form.identificacion.trim(), nombre: form.nombre.trim(), proyecto: form.proyecto.trim() };
    try {
      const wasEditing = Boolean(editing);
      if (editing) await actualizarPersona(tipo, editing.id, data); else await crearPersona(tipo, data);
      invalidate(); setPage(1); await load(1, true); closeModal();
      setNotice({ error: false, text: "Registro " + (wasEditing ? "actualizado" : "creado") + " correctamente." });
    } catch (error) { setFormError(error instanceof Error ? error.message : "No fue posible guardar el registro."); }
  };

  const edit = (item: Persona) => {
    setEditing(item); setFormError(null);
    setForm({ identificacion: item.codigo ?? item.documento ?? "", nombre: item.nombre, correo: item.correo ?? "", proyecto: item.proyecto ?? "" });
    setIsFormModalOpen(true);
  };
  const remove = async (item: Persona) => {
    if (!window.confirm("¿Desea eliminar a " + item.nombre + "?")) return;
    try { await eliminarPersona(tipo, item.id); if (editing?.id === item.id) closeModal(); invalidate(); await load(page, true); setNotice({ error: false, text: "Registro eliminado correctamente." }); }
    catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : "No fue posible eliminar el registro." }); }
  };
  const downloadTemplate = () => {
    const headers = isStudent ? ["Código", "Nombre", "Correo"] : ["ID", "NOMBRE"];
    const sheet = XLSX.utils.aoa_to_sheet([headers]);
    sheet["!cols"] = isStudent ? [{ wch: 18 }, { wch: 32 }, { wch: 38 }] : [{ wch: 18 }, { wch: 32 }];
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, content.plural);
    XLSX.writeFile(book, isStudent ? "plantilla_estudiantes.xlsx" : "plantilla_docentes.xlsx");
  };
  const upload = async (file: File) => {
    setUploading(true); setNotice(null);
    try {
      const result = isStudent ? await importarEstudiantesExcel(file) : await importarDocentesExcel(file);
      invalidate(); setPage(1); await load(1, true);
      const duplicadas = result.omitidasDuplicadas ? " Se omitieron " + result.omitidasDuplicadas + " filas duplicadas, conservando la primera aparición de cada ID." : "";
      const conservados = result.conservadosPorHistorial ? " Se conservaron " + result.conservadosPorHistorial + " con historial relacionado." : "";
      setNotice({ error: false, text: "Carga completa: " + result.total + " filas, " + result.creados + " creadas, " + result.actualizados + " actualizadas y " + result.eliminados + " eliminadas." + duplicadas + conservados });
    } catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : "No fue posible importar el Excel." }); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ""; }
  };

  const personForm = <form onSubmit={(event) => void save(event)}><div className="dialog-grid"><label className="dialog-field"><span>{content.identifier}</span><input value={form.identificacion} onChange={(event) => setForm({ ...form, identificacion: event.target.value })} inputMode="numeric" required autoFocus /></label><label className="dialog-field"><span>Nombre completo</span><input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} maxLength={160} required /></label>{isStudent ? <label className="dialog-field dialog-field-wide"><span>Correo institucional <small>Opcional</small></span><input type="email" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} maxLength={254} /></label> : <label className="dialog-field dialog-field-wide"><span>Proyecto</span><input value={form.proyecto} onChange={(event) => setForm({ ...form, proyecto: event.target.value })} maxLength={160} required /></label>}</div>{formError && <p className="auth-feedback auth-feedback-error" role="alert">{formError}</p>}<footer><button type="button" className="dialog-cancel" onClick={closeModal}>Cancelar</button><button className="button-primary">{editing ? "Guardar cambios" : "Registrar " + content.singular}</button></footer></form>;

  return <><section className="page-heading"><div><h1>{content.plural}</h1><p>Gestión temporal para administración. Estos registros no crean cuentas de usuario.</p></div><div className={styles.headerActions}><span className="live-status">{meta.total} registrados</span><button type="button" className="button-primary" onClick={openCreate}>+ Registrar {content.singular}</button><button type="button" className={"button-secondary " + styles.secondaryAction} onClick={() => fileInput.current?.click()} disabled={uploading}>{uploading ? "Importando…" : "Importar Excel"}</button><button type="button" className={"button-secondary " + styles.secondaryAction} onClick={downloadTemplate}>Descargar plantilla Excel</button><input ref={fileInput} hidden type="file" accept=".xlsx,.xls" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></div></section>{notice && <div className={notice.error ? styles.noticeError : styles.notice} role="status">{notice.text}</div>}<section className={styles.studentRegistry} aria-label={"Listado de " + content.plural.toLowerCase()}><header className={styles.registryHeader}><div><h2>{content.plural} registrados</h2><p>Consulte, modifique o elimine los registros según sus permisos.</p></div><input className={styles.search} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={isStudent ? "Buscar por código, nombre o correo..." : "Buscar por ID o nombre..."} /></header><PersonList items={items} tipo={tipo} onEdit={edit} onDelete={(item) => void remove(item)} /><footer className={styles.pagination}><span>Mostrando {items.length ? (meta.page - 1) * meta.limit + 1 : 0}-{(meta.page - 1) * meta.limit + items.length} de {meta.total}</span><div><button type="button" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>Anterior</button><strong>Página {meta.page} de {meta.totalPages || 1}</strong><button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>Siguiente</button></div></footer></section>{isFormModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}><section className="audiovisual-dialog" role="dialog" aria-modal="true" aria-labelledby="person-form-title"><header><div><h2 id="person-form-title">{editing ? "Modificar " + content.singular : "Registrar " + content.singular}</h2><p>{isStudent ? "Registre la información individual del estudiante." : "Registre la información individual del docente."}</p></div><button type="button" onClick={closeModal} aria-label="Cerrar">×</button></header>{personForm}</section></div>}</>;
}

function PersonList({ items, tipo, onEdit, onDelete }: { items: Persona[]; tipo: Tipo; onEdit: (item: Persona) => void; onDelete: (item: Persona) => void }) {
  return <div className={styles.list}>{items.map((item) => <article key={item.id}><div><strong>{item.nombre.toLocaleUpperCase("es-CO")}</strong><small>{item.codigo ?? item.documento ?? "Sin identificación"}{tipo === "estudiantes" ? item.correo ? " · " + item.correo : "" : item.proyecto ? " · " + item.proyecto : ""}</small></div><div className={styles.actions}><button type="button" onClick={() => onEdit(item)}>Modificar</button><button type="button" className={styles.delete} onClick={() => onDelete(item)}>Eliminar</button></div></article>)}{!items.length && <p className={styles.empty}>No hay registros que coincidan con la búsqueda.</p>}</div>;
}
