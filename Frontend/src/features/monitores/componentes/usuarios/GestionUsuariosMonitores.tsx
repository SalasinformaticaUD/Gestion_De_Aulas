"use client";

import { useEffect, useRef, useState } from "react";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import styles from "./GestionUsuariosMonitores.module.css";

type Rol = "admin" | "leader";
type Dependencia = "physics" | "informatics_labs" | "electrical" | null;
type UsuarioGestion = {
  id: string; username: string; email: string; first_name: string; last_name: string;
  full_name: string; role: Rol; department: Dependencia; is_active: boolean;
  source: "AULAS" | "MONITORES"; usuario_externo_id: string | null;
};
const vacio = { username: "", email: "", first_name: "", last_name: "", password: "", role: "leader" as Rol, department: null as Dependencia, is_active: true };
const dependencias: Array<[Exclude<Dependencia, null>, string]> = [["physics", "Física"], ["informatics_labs", "Aulas de Software"], ["electrical", "Laboratorios"]];
const nombreRol = (rol: Rol) => rol === "admin" ? "Administrador" : "Líder";

export function GestionUsuariosMonitores() {
  const [usuarios, setUsuarios] = useState<UsuarioGestion[]>([]);
  const [form, setForm] = useState(vacio);
  const [edicion, setEdicion] = useState<UsuarioGestion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");
  const [rolActual, setRolActual] = useState<string | null>(null);
  const formularioRef = useRef<HTMLElement | null>(null);
  const nombresRef = useRef<HTMLInputElement | null>(null);

  const cargar = async () => {
    setCargando(true); setError("");
    try {
      const [me, lista] = await Promise.all([servicioMonitores.obtenerPerfilMonitores(), servicioMonitores.listarUsuariosGestion()]);
      setRolActual(me.role); setUsuarios(lista);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar los usuarios."); }
    finally { setCargando(false); }
  };
  useEffect(() => { void cargar(); }, []);

  const limpiar = () => { setEdicion(null); setForm(vacio); setNuevaClave(""); setAviso(""); };
  const crearUsuarioLocal = () => {
    limpiar();
    requestAnimationFrame(() => {
      formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nombresRef.current?.focus();
    });
  };
  const editar = (usuario: UsuarioGestion) => {
    if (usuario.source === "AULAS") { setError("Esta cuenta se administra desde Gestión de Aulas."); return; }
    setError(""); setAviso(""); setNuevaClave(""); setEdicion(usuario);
    setForm({ username: usuario.username, email: usuario.email, first_name: usuario.first_name, last_name: usuario.last_name, password: "", role: usuario.role, department: usuario.department, is_active: usuario.is_active });
  };
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setAviso("");
    if (form.role === "leader" && !form.department) { setError("Seleccione la dependencia del líder."); return; }
    try {
      const datos = { ...form, department: form.role === "leader" ? form.department : null };
      if (edicion) await servicioMonitores.actualizarUsuarioGestion(edicion.id, { ...datos, password: undefined });
      else await servicioMonitores.crearUsuarioGestion(datos);
      await cargar(); limpiar(); setAviso(edicion ? "Usuario actualizado." : "Usuario local creado.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar el usuario."); }
  };
  const cambiarClave = async () => {
    if (!edicion || nuevaClave.length < 10) { setError("La nueva contraseña debe tener al menos 10 caracteres."); return; }
    setError("");
    try { await servicioMonitores.restablecerClaveUsuarioGestion(edicion.id, nuevaClave); setNuevaClave(""); setAviso("Contraseña restablecida correctamente."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible restablecer la contraseña."); }
  };

  if (cargando) return <main className={styles.loading}>Cargando módulo de usuarios…</main>;
  if (rolActual !== "admin") return <main className={styles.loading}>Este módulo está disponible solo para administradores de Gestión de Monitores.</main>;

  return <section className={styles.page}>
    <header className={styles.heading}><div><span>Administración</span><h1>Usuarios</h1><p>Administre las cuentas locales de administradores y líderes. Los usuarios procedentes de Aulas se consultan aquí, pero se modifican desde su sistema de origen.</p></div><button type="button" className={styles.newButton} onClick={crearUsuarioLocal}>+ Nuevo usuario local</button></header>
    {error && <p className={styles.error} role="alert">{error}</p>}{aviso && <p className={styles.notice} role="status">{aviso}</p>}
    <div className={styles.grid}>
      <section ref={formularioRef} className={styles.card}><div className={styles.cardHeader}><h2>{edicion ? "Editar usuario local" : "Crear usuario local"}</h2><p>{edicion ? "Los cambios se aplican únicamente a esta cuenta local." : "Use esta opción para cuentas que no provienen de Gestión de Aulas."}</p></div>
        <form onSubmit={(event) => void guardar(event)} className={styles.form}>
          <div className={styles.two}><label><span>Nombres</span><input ref={nombresRef} value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required /></label><label><span>Apellidos</span><input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label></div>
          <div className={styles.two}><label><span>Usuario</span><input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></label><label><span>Correo</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label></div>
          {!edicion && <label><span>Contraseña inicial</span><input type="password" minLength={10} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><small>Mínimo 10 caracteres.</small></label>}
          <div className={styles.two}><label><span>Perfil</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Rol, department: event.target.value === "admin" ? null : form.department })}><option value="leader">Líder de dependencia</option><option value="admin">Administrador de Monitores</option></select></label>{form.role === "leader" && <label><span>Dependencia</span><select value={form.department ?? ""} onChange={(event) => setForm({ ...form, department: event.target.value as Dependencia })} required><option value="">Seleccionar dependencia</option>{dependencias.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}</div>
          <label className={styles.switch}><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span>Cuenta activa</span></label>
          <footer><button type="button" className={styles.secondary} onClick={limpiar}>Limpiar</button><button className={styles.primary}>{edicion ? "Guardar cambios" : "Crear usuario"}</button></footer>
        </form>
        {edicion && <div className={styles.passwordBox}><h3>Restablecimiento urgente</h3><p>Define una nueva contraseña para esta cuenta local.</p><div><input type="password" placeholder="Nueva contraseña" minLength={10} value={nuevaClave} onChange={(event) => setNuevaClave(event.target.value)} /><button type="button" onClick={() => void cambiarClave()}>Restablecer</button></div></div>}
      </section>
      <section className={styles.card}><div className={styles.cardHeader}><h2>Administradores y líderes</h2><p>{usuarios.length} cuenta(s) administrativa(s).</p></div><div className={styles.list}>{usuarios.map((usuario) => <article key={usuario.id}><div className={styles.identity}><strong>{usuario.full_name}</strong><small>{usuario.username} · {usuario.email}</small><div><span className={usuario.role === "admin" ? styles.admin : styles.leader}>{nombreRol(usuario.role)}</span>{usuario.department && <span className={styles.department}>{dependencias.find(([value]) => value === usuario.department)?.[1]}</span>}</div></div><div className={styles.actions}><span className={usuario.source === "AULAS" ? styles.external : styles.local}>{usuario.source === "AULAS" ? "Sincronizado desde Aulas" : "Cuenta local"}</span><span className={usuario.is_active ? styles.active : styles.inactive}>{usuario.is_active ? "Activa" : "Inactiva"}</span>{usuario.source === "MONITORES" ? <button type="button" onClick={() => editar(usuario)}>Editar</button> : <small>Editar en Aulas</small>}</div></article>)}{!usuarios.length && <p className={styles.empty}>No hay administradores ni líderes registrados.</p>}</div></section>
    </div>
  </section>;
}
