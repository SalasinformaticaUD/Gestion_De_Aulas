"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./UsuariosView.module.css";
import type { Usuario } from "../types";
import { actualizarCargo, actualizarRol, actualizarUsuario, crearCargo, crearRol, crearUsuario, listarCargos, listarPermisos, listarRoles, listarUsuarios, type CargoCatalogo, type PermisoCatalogo, type RolCatalogo } from "@/features/usuarios/api/usuariosApi";

const vacio = { nombreCompleto: "", nombreUsuario: "", correo: "", cargo: "", dependencia: "Aulas de Software", permisos: [] as string[], password: "", rolIds: [] as string[] };

export function UsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<RolCatalogo[]>([]);
  const [cargos, setCargos] = useState<CargoCatalogo[]>([]);
  const [permisos, setPermisos] = useState<PermisoCatalogo[]>([]);
  const [rolesCargados, setRolesCargados] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [edicion, setEdicion] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);
  const [aviso, setAviso] = useState("");
  const [rolSeleccionadoId, setRolSeleccionadoId] = useState("");
  const [rolNombre, setRolNombre] = useState("");
  const [rolDescripcion, setRolDescripcion] = useState("");
  const [rolPermisoIds, setRolPermisoIds] = useState<string[]>([]);
  const [cargoNombre, setCargoNombre] = useState("");
  const [cargoDescripcion, setCargoDescripcion] = useState("");

  const cargar = async () => {
    try {
      const [nextUsuarios, nextRoles, nextCargos, nextPermisos] = await Promise.all([listarUsuarios(), listarRoles(), listarCargos(), listarPermisos()]);
      setUsuarios(nextUsuarios);
      setRoles(nextRoles);
      setCargos(nextCargos);
      setPermisos(nextPermisos);
      setRolesCargados(true);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No fue posible cargar usuarios y roles.");
    }
  };

  useEffect(() => { void cargar(); }, []);
  const visibles = useMemo(() => usuarios.filter((usuario) => `${usuario.nombreCompleto} ${usuario.nombreUsuario} ${usuario.correo}`.toLowerCase().includes(busqueda.toLowerCase())), [usuarios, busqueda]);
  const alternarRol = (rolId: string) => setForm((actual) => ({ ...actual, rolIds: actual.rolIds.includes(rolId) ? actual.rolIds.filter((id) => id !== rolId) : [...actual.rolIds, rolId] }));
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
      setAviso(rolSeleccionadoId ? "Rol y permisos actualizados." : "Rol creado correctamente.");
    } catch (error) { setAviso(error instanceof Error ? error.message : "No fue posible guardar el rol."); }
  };
  const guardarCargo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cargoNombre.trim()) return;
    try {
      await crearCargo({ nombre: cargoNombre.trim(), descripcion: cargoDescripcion.trim() || undefined });
      await cargar();
      setCargoNombre("");
      setCargoDescripcion("");
      setAviso("Cargo creado correctamente.");
    } catch (error) { setAviso(error instanceof Error ? error.message : "No fue posible crear el cargo."); }
  };
  const cambiarEstadoCargo = async (cargo: CargoCatalogo) => {
    try { await actualizarCargo(cargo.id, { activo: !cargo.activo }); await cargar(); setAviso(`Cargo ${cargo.activo ? "desactivado" : "activado"}.`); } catch (error) { setAviso(error instanceof Error ? error.message : "No fue posible actualizar el cargo."); }
  };

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nombreCompleto || !form.nombreUsuario || !form.correo || (!edicion && !form.password)) return;
    try {
      const datos = { nombreCompleto: form.nombreCompleto, nombreUsuario: form.nombreUsuario, correo: form.correo, cargo: form.cargo || undefined, ...(rolesCargados ? { rolIds: form.rolIds } : {}) };
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
    setForm({ ...vacio, nombreCompleto: usuario.nombreCompleto, nombreUsuario: usuario.nombreUsuario, correo: usuario.correo, cargo: usuario.cargo, dependencia: usuario.dependencia, permisos: usuario.permisos, rolIds: roles.filter((rol) => usuario.permisos.includes(rol.nombre)).map((rol) => rol.id) });
  };

  return <>
    <section className="page-heading"><div><span className={styles.etiqueta}>Administración del sistema</span><h1>Usuarios</h1><p>Cree, modifique y asigne los accesos del sistema.</p></div><span className="live-status">{usuarios.filter((usuario) => usuario.estado === "ACTIVA").length} activos</span></section>
    {aviso && <div className={`${styles.aviso} ${styles.exito}`} role="status">{aviso}</div>}
    <div className={styles.layout}>
      <section className={styles.card}>
        <header><h2>{edicion ? "Modificar usuario" : "Crear usuario"}</h2><p>Cargo identifica a la persona; los roles determinan sus permisos de acceso.</p></header>
        <form onSubmit={(event) => void guardar(event)}>
          <label><span>Nombre completo</span><input value={form.nombreCompleto} onChange={(event) => setForm({ ...form, nombreCompleto: event.target.value })} required /></label>
          <label><span>Nombre de usuario</span><input value={form.nombreUsuario} onChange={(event) => setForm({ ...form, nombreUsuario: event.target.value })} required /></label>
          <label><span>Correo</span><input type="email" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} required /></label>
          <label><span>{edicion ? "Nueva contraseña (opcional)" : "Contraseña"}</span><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!edicion} minLength={10} /></label>
          <label><span>Cargo</span><select value={form.cargo} onChange={(event) => setForm({ ...form, cargo: event.target.value })}><option value="">Seleccionar cargo</option>{cargos.filter((cargo) => cargo.activo || cargo.nombre === form.cargo).map((cargo) => <option key={cargo.id} value={cargo.nombre}>{cargo.nombre}</option>)}</select></label>
          <fieldset><legend>Roles de acceso</legend><div className={styles.permissionGrid}>{roles.map((rol) => <label key={rol.id}><input type="checkbox" checked={form.rolIds.includes(rol.id)} onChange={() => alternarRol(rol.id)} /><span>{rol.nombre}</span></label>)}{rolesCargados && roles.length === 0 && <p className={styles.empty}>No hay roles creados en el catálogo.</p>}{!rolesCargados && <p className={styles.empty}>Cargando roles disponibles…</p>}</div></fieldset>
          <footer><button type="button" className="button-secondary" onClick={() => { setForm(vacio); setEdicion(null); }}>Limpiar</button><button className="button-primary">{edicion ? "Guardar cambios" : "Crear usuario"}</button></footer>
        </form>
      </section>
      <section className={styles.card}>
        <header><div><h2>Usuarios registrados</h2><p>Datos y roles cargados desde la API central.</p></div><input className={styles.search} placeholder="Buscar usuario..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} /></header>
        <div className={styles.list}>{visibles.map((usuario) => <article key={usuario.id}><div><strong>{usuario.nombreCompleto}</strong><small>{usuario.nombreUsuario} · {usuario.correo}</small><small>{usuario.cargo || "Sin cargo"} · {usuario.dependencia}</small></div><div className={styles.meta}><span className={`${styles.status} ${usuario.estado === "ACTIVA" ? styles.active : styles.inactive}`}>{usuario.estado}</span><span>{usuario.permisos.length} roles</span><button type="button" onClick={() => editar(usuario)}>Modificar</button></div></article>)}{!visibles.length && <p className={styles.empty}>No hay usuarios que coincidan con la búsqueda.</p>}</div>
      </section>
    </div>
    <section className={styles.accessManagement}>
      <header><div><h2>Roles, permisos y cargos</h2><p>Configuración disponible para administradores. Los cambios se aplican a través de la API central.</p></div></header>
      <div className={styles.managementGrid}>
        <form className={styles.managementForm} onSubmit={(event) => void guardarRol(event)}>
          <h3>{rolSeleccionadoId ? "Modificar rol" : "Crear rol"}</h3>
          <label><span>Rol</span><select value={rolSeleccionadoId} onChange={(event) => seleccionarRol(event.target.value)}><option value="">Nuevo rol</option>{roles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}</select></label>
          <label><span>Nombre</span><input value={rolNombre} onChange={(event) => setRolNombre(event.target.value)} placeholder="Ej. COORDINADOR" required /></label>
          <label><span>Descripción</span><input value={rolDescripcion} onChange={(event) => setRolDescripcion(event.target.value)} placeholder="Alcance del rol" /></label>
          <fieldset><legend>Permisos asignados</legend><div className={styles.permissionGrid}>{permisos.map((permiso) => <label key={permiso.id}><input type="checkbox" checked={rolPermisoIds.includes(permiso.id)} onChange={() => alternarPermiso(permiso.id)} /><span>{permiso.codigo}</span></label>)}</div></fieldset>
          <footer><button type="button" className="button-secondary" onClick={() => seleccionarRol("")}>Nuevo</button><button className="button-primary">{rolSeleccionadoId ? "Guardar permisos" : "Crear rol"}</button></footer>
        </form>
        <div className={styles.managementForm}>
          <h3>Cargos disponibles</h3>
          <form onSubmit={(event) => void guardarCargo(event)}><label><span>Nuevo cargo</span><input value={cargoNombre} onChange={(event) => setCargoNombre(event.target.value)} placeholder="Ej. AUXILIAR" required /></label><label><span>Descripción</span><input value={cargoDescripcion} onChange={(event) => setCargoDescripcion(event.target.value)} placeholder="Opcional" /></label><button className="button-primary">Crear cargo</button></form>
          <div className={styles.catalogList}>{cargos.map((cargo) => <article key={cargo.id}><div><strong>{cargo.nombre}</strong><small>{cargo.descripcion || "Sin descripción"}</small></div><button type="button" onClick={() => void cambiarEstadoCargo(cargo)}>{cargo.activo ? "Desactivar" : "Activar"}</button></article>)}</div>
        </div>
      </div>
    </section>
  </>;
}
