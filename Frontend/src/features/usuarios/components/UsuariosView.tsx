"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./UsuariosView.module.css";
import permissionStyles from "./RolePermissions.module.css";
import type { Usuario } from "../types";
import { actualizarRol, actualizarUsuario, crearRol, crearUsuario, listarPermisos, listarRoles, listarUsuarios, type PermisoCatalogo, type RolCatalogo } from "@/features/usuarios/api/usuariosApi";
import { obtenerSesion } from "@/features/auth/lib/sesion";

const vacio = { nombreCompleto: "", nombreUsuario: "", correo: "", cargo: "", dependencia: "Aulas de Software", permisos: [] as string[], password: "", rolIds: [] as string[] };

export function UsuariosView() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<RolCatalogo[]>([]);
  const [permisos, setPermisos] = useState<PermisoCatalogo[]>([]);
  const [rolesCargados, setRolesCargados] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaPermiso, setBusquedaPermiso] = useState("");
  const [edicion, setEdicion] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);
  const [aviso, setAviso] = useState("");
  const [rolSeleccionadoId, setRolSeleccionadoId] = useState("");
  const [rolNombre, setRolNombre] = useState("");
  const [rolDescripcion, setRolDescripcion] = useState("");
  const [rolPermisoIds, setRolPermisoIds] = useState<string[]>([]);
  const [isAdministrator, setIsAdministrator] = useState<boolean | null>(null);

  const cargar = async () => {
    try {
      const [nextUsuarios, nextRoles, nextPermisos] = await Promise.all([listarUsuarios(), listarRoles(), listarPermisos()]);
      setUsuarios(nextUsuarios);
      setRoles(nextRoles);
      setPermisos(nextPermisos);
      setRolesCargados(true);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No fue posible cargar usuarios y roles.");
    }
  };

  useEffect(() => {
    const allowed = obtenerSesion()?.usuario.roles.some((rol) => rol.trim().toUpperCase() === "ADMINISTRADOR") ?? false;
    setIsAdministrator(allowed);
    if (!allowed) {
      router.replace("/?acceso=denegado");
      return;
    }
    void cargar();
  }, [router]);
  const visibles = useMemo(() => usuarios.filter((usuario) => `${usuario.nombreCompleto} ${usuario.nombreUsuario} ${usuario.correo}`.toLowerCase().includes(busqueda.toLowerCase())), [usuarios, busqueda]);
  const permisosVisibles = useMemo(() => {
    const termino = busquedaPermiso.trim().toLocaleLowerCase("es");
    return permisos.filter((permiso) => !termino || permiso.codigo.toLocaleLowerCase("es").includes(termino));
  }, [busquedaPermiso, permisos]);
  const permisosPorModulo = useMemo(() => {
    const grupos = new Map<string, { nombre: string; permisos: PermisoCatalogo[] }>();
    for (const permiso of permisosVisibles) {
      const codigo = permiso.modulo.codigo;
      const grupo = grupos.get(codigo) ?? { nombre: permiso.modulo.nombre, permisos: [] };
      grupo.permisos.push(permiso);
      grupos.set(codigo, grupo);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [permisosVisibles]);
  if (isAdministrator !== true) return <main className="access-guard-loading">{isAdministrator === false ? "Acceso exclusivo para el administrador." : "Verificando acceso..."}</main>;
  const alternarPermiso = (permisoId: string) => setRolPermisoIds((actual) => actual.includes(permisoId) ? actual.filter((id) => id !== permisoId) : [...actual, permisoId]);
  const seleccionarRol = (id: string) => {
    setRolSeleccionadoId(id);
    const rol = roles.find((item) => item.id === id);
    setRolNombre(rol?.nombre ?? "");
    setRolDescripcion(rol?.descripcion ?? "");
    setRolPermisoIds(rol?.permisos.map((item) => item.permiso.id) ?? []);
  };
  const guardarRol = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rolNombre.trim()) return;
    try {
      if (rolSeleccionadoId) await actualizarRol(rolSeleccionadoId, { nombre: rolNombre.trim(), descripcion: rolDescripcion.trim() || undefined, permisoIds: rolPermisoIds });
      else await crearRol({ nombre: rolNombre.trim(), descripcion: rolDescripcion.trim() || undefined, permisoIds: rolPermisoIds });
      await cargar();
      seleccionarRol("");
      setAviso(rolSeleccionadoId ? "Cargo y permisos actualizados." : "Cargo creado correctamente.");
    } catch (error) { setAviso(error instanceof Error ? error.message : "No fue posible guardar el cargo."); }
  };
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nombreCompleto || !form.nombreUsuario || !form.correo || !form.rolIds[0] || (!edicion && !form.password)) return;
    try {
      const cargo = roles.find((rol) => rol.id === form.rolIds[0])?.nombre;
      const datos = { nombreCompleto: form.nombreCompleto, nombreUsuario: form.nombreUsuario, correo: form.correo, cargo, ...(rolesCargados ? { rolIds: form.rolIds } : {}) };
      if (edicion) await actualizarUsuario(edicion, { ...datos, password: form.password || undefined });
      else await crearUsuario({ ...datos, password: form.password });
      await cargar();
      setAviso(edicion ? "Usuario actualizado correctamente." : "Usuario creado correctamente.");
      setForm(vacio);
      setEdicion(null);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No fue posible guardar el usuario.");
    }
  };

  const editar = (usuario: Usuario) => {
    setEdicion(usuario.id);
    const cargoId = roles.find((rol) => usuario.permisos.includes(rol.nombre))?.id ?? "";
    setForm({ ...vacio, nombreCompleto: usuario.nombreCompleto, nombreUsuario: usuario.nombreUsuario, correo: usuario.correo, cargo: usuario.cargo, dependencia: usuario.dependencia, permisos: usuario.permisos, rolIds: cargoId ? [cargoId] : [] });
  };

  return <>
    <section className="page-heading"><div><span className={styles.etiqueta}>Administración del sistema</span><h1>Usuarios</h1><p>Cree, modifique y asigne los accesos del sistema.</p></div><span className="live-status">{usuarios.filter((usuario) => usuario.estado === "ACTIVA").length} activos</span></section>
    {aviso && <div className={`${styles.aviso} ${styles.exito}`} role="status">{aviso}</div>}
    <div className={styles.layout}>
      <section className={styles.card}>
        <header><h2>{edicion ? "Modificar usuario" : "Crear usuario"}</h2><p>El cargo seleccionado define todos los permisos de acceso del usuario.</p></header>
        <form onSubmit={(event) => void guardar(event)}>
          <label><span>Nombre completo</span><input value={form.nombreCompleto} onChange={(event) => setForm({ ...form, nombreCompleto: event.target.value })} required /></label>
          <label><span>Nombre de usuario</span><input value={form.nombreUsuario} onChange={(event) => setForm({ ...form, nombreUsuario: event.target.value })} required /></label>
          <label><span>Correo</span><input type="email" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} required /></label>
          <label><span>{edicion ? "Nueva contraseña (opcional)" : "Contraseña"}</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!edicion} minLength={10} /></label>
          <label><span>Cargo</span><select value={form.rolIds[0] ?? ""} onChange={(event) => { const cargo = roles.find((rol) => rol.id === event.target.value); setForm({ ...form, cargo: cargo?.nombre ?? "", rolIds: event.target.value ? [event.target.value] : [] }); }} required><option value="">Seleccionar cargo</option>{roles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}</select>{rolesCargados && roles.length === 0 && <small className={styles.empty}>No hay cargos configurados.</small>}{!rolesCargados && <small className={styles.empty}>Cargando cargos disponibles…</small>}</label>
          <footer><button type="button" className="button-secondary usuarios-actions-secondary" onClick={() => { setForm(vacio); setEdicion(null); }}>Limpiar</button><button className="button-primary">{edicion ? "Guardar cambios" : "Crear usuario"}</button></footer>
        </form>
      </section>
      <section className={styles.card}>
        <header><div><h2>Usuarios registrados</h2><p>Datos y cargos cargados desde la API central.</p></div><input className={styles.search} placeholder="Buscar usuario..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} /></header>
        <div className={styles.list}>{visibles.map((usuario) => <article key={usuario.id}><div><strong>{usuario.nombreCompleto}</strong><small>{usuario.nombreUsuario} · {usuario.correo}</small><small>{usuario.cargo || usuario.permisos[0] || "Sin cargo"}</small></div><div className={styles.meta}><span className={`${styles.status} ${usuario.estado === "ACTIVA" ? styles.active : styles.inactive}`}>{usuario.estado}</span><span>{usuario.permisos.length ? "Cargo con permisos" : "Sin cargo"}</span><button type="button" onClick={() => editar(usuario)}>Modificar</button></div></article>)}{!visibles.length && <p className={styles.empty}>No hay usuarios que coincidan con la búsqueda.</p>}</div>
      </section>
    </div>
    <section className={styles.accessManagement}>
      <header><div><h2>Cargos y permisos</h2><p>Configure los cargos y los permisos que cada uno concede.</p></div></header>
      <div className={styles.managementGrid} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <form className={styles.managementForm} onSubmit={(event) => void guardarRol(event)}>
          <h3>{rolSeleccionadoId ? "Modificar cargo" : "Crear cargo"}</h3>
          <label><span>Cargo</span><select value={rolSeleccionadoId} onChange={(event) => seleccionarRol(event.target.value)}><option value="">Nuevo cargo</option>{roles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}</select></label>
          <label><span>Nombre del cargo</span><input value={rolNombre} onChange={(event) => setRolNombre(event.target.value)} placeholder="Ej. COORDINADOR" required /></label>
          <label><span>Descripción</span><input value={rolDescripcion} onChange={(event) => setRolDescripcion(event.target.value)} placeholder="Alcance del cargo" /></label>
          <fieldset className={permissionStyles.permissionsFieldset}><legend>Permisos asignados</legend><div className={permissionStyles.permissionTools}><input type="search" value={busquedaPermiso} onChange={(event) => setBusquedaPermiso(event.target.value)} placeholder="Buscar permiso..." aria-label="Buscar permiso asignable" /><small>{permisosVisibles.length} de {permisos.length} permisos</small></div><div className={permissionStyles.permissionScroll}>{permisosPorModulo.map(([codigo, grupo]) => <section key={codigo} className={permissionStyles.moduleGroup}><header><strong>{grupo.nombre}</strong><span>{grupo.permisos.length} permiso(s)</span></header><div className={styles.permissionGrid}>{grupo.permisos.map((permiso) => <label key={permiso.id}><input type="checkbox" checked={rolPermisoIds.includes(permiso.id)} onChange={() => alternarPermiso(permiso.id)} /><span>{permiso.codigo}</span></label>)}</div></section>)}{!permisosVisibles.length && <p className={permissionStyles.empty}>No hay permisos que coincidan.</p>}</div></fieldset>
          <footer><button className="button-primary">{rolSeleccionadoId ? "Guardar cargo" : "Crear cargo"}</button></footer>
        </form>
      </div>
    </section>
  </>;
}
