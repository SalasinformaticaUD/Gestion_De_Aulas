"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actualizarPersona,
  crearPersona,
  eliminarPersona,
  listarPersonas,
  type Persona,
} from "../api/personasApi";
import styles from "./PeopleManagementView.module.css";

type Tipo = "estudiantes" | "docentes";
const titles: Record<Tipo, { plural: string; singular: string; identifier: string }> = {
  estudiantes: { plural: "Estudiantes", singular: "estudiante", identifier: "Código estudiantil" },
  docentes: { plural: "Docentes", singular: "docente", identifier: "Documento" },
};
const emptyForm = { identificacion: "", nombre: "", correo: "" };

export function PeopleManagementView({ tipo }: { tipo: Tipo }) {
  const [items, setItems] = useState<Persona[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Persona | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const content = titles[tipo];

  const load = useCallback(async () => {
    try {
      setItems(await listarPersonas(tipo));
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "No fue posible cargar los registros." });
    }
  }, [tipo]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) =>
      !term || [item.codigo, item.documento, item.nombre, item.correo].filter(Boolean).join(" ").toLowerCase().includes(term),
    );
  }, [items, query]);

  const reset = () => { setEditing(null); setForm(emptyForm); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    if (!/^\d{3,50}$/.test(form.identificacion.trim())) {
      setNotice({ error: true, text: content.identifier + " debe contener únicamente números." });
      return;
    }
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{3,160}$/.test(form.nombre.trim())) {
      setNotice({ error: true, text: "El nombre debe contener únicamente letras y espacios." });
      return;
    }
    const data = {
      ...(tipo === "estudiantes" ? { codigo: form.identificacion.trim() } : { documento: form.identificacion.trim() }),
      nombre: form.nombre.trim(),
      correo: form.correo.trim() || undefined,
    };
    try {
      if (editing) await actualizarPersona(tipo, editing.id, data);
      else await crearPersona(tipo, data);
      await load();
      const action = editing ? "actualizado" : "creado";
      reset();
      setNotice({ error: false, text: "Registro " + action + " correctamente." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "No fue posible guardar el registro." });
    }
  };

  const edit = (item: Persona) => {
    setEditing(item);
    setForm({ identificacion: item.codigo ?? item.documento ?? "", nombre: item.nombre, correo: item.correo ?? "" });
  };

  const remove = async (item: Persona) => {
    if (!window.confirm("¿Desea eliminar a " + item.nombre + "?")) return;
    try {
      await eliminarPersona(tipo, item.id);
      if (editing?.id === item.id) reset();
      await load();
      setNotice({ error: false, text: "Registro eliminado correctamente." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "No fue posible eliminar el registro." });
    }
  };

  return <><section className="page-heading"><div><h1>{content.plural}</h1><p>Gestión temporal para administración. Estos registros no crean cuentas de usuario.</p></div><span className="live-status">{items.length} registrados</span></section>{notice && <div className={notice.error ? styles.noticeError : styles.notice} role="status">{notice.text}</div>}<div className={styles.layout}><section className={styles.card}><header><h2>{editing ? "Modificar " + content.singular : "Crear " + content.singular}</h2><p>La operación se valida con los permisos asignados al usuario.</p></header><form onSubmit={(event) => void save(event)}><label><span>{content.identifier}</span><input value={form.identificacion} onChange={(event) => setForm({ ...form, identificacion: event.target.value })} inputMode="numeric" required /></label><label><span>Nombre completo</span><input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} maxLength={160} required /></label><label><span>Correo institucional <small>Opcional</small></span><input type="email" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} maxLength={254} /></label><footer><button type="button" className="button-secondary" onClick={reset}>Cancelar</button><button className="button-primary">{editing ? "Guardar cambios" : "Crear registro"}</button></footer></form></section><section className={styles.card}><header><div><h2>Registros existentes</h2><p>Consulta, modificación y eliminación según permisos.</p></div><input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." /></header><div className={styles.list}>{visible.map((item) => <article key={item.id}><div><strong>{item.nombre}</strong><small>{item.codigo ?? item.documento ?? "Sin identificación"}{item.correo ? " · " + item.correo : ""}</small></div><div className={styles.actions}><button type="button" onClick={() => edit(item)}>Modificar</button><button type="button" className={styles.delete} onClick={() => void remove(item)}>Eliminar</button></div></article>)}{!visible.length && <p className={styles.empty}>No hay registros que coincidan con la búsqueda.</p>}</div></section></div></>;
}
