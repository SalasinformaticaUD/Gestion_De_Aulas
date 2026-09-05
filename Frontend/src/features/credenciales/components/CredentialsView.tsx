"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  actualizarCredencial,
  actualizarRolesCredencial,
  cambiarContrasenaCredencial,
  consultarSecretoCredencial,
  crearCredencial,
  eliminarCredencial,
  listarCredenciales,
  listarRolesParaCredenciales,
  verificarAccesoCredenciales,
  type CredencialApi,
  type RolApi,
} from "@/features/credenciales/api/credencialesApi";
import styles from "./CredentialsView.module.css";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "No fue posible completar la operación.";
type Modal = "new" | "edit" | "roles" | "change-password" | "delete" | null;

export function CredentialsView() {
  const [items, setItems] = useState<CredencialApi[]>([]);
  const [roles, setRoles] = useState<RolApi[]>([]);
  const [query, setQuery] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<CredencialApi | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const pressedCredential = useRef<string | null>(null);

  const show = useCallback((text: string, error = false) => { setNotice(text); setBad(error); }, []);
  const reload = useCallback(async () => { try { setItems(await listarCredenciales()); } catch (error) { show(errorMessage(error), true); } }, [show]);
  const run = async (operation: () => Promise<unknown>, text: string) => { try { await operation(); await reload(); setModal(null); setSelected(null); show(text); } catch (error) { show(errorMessage(error), true); throw error; } };
  useEffect(() => { if (unlocked) void reload(); }, [reload, unlocked]);
  const visible = useMemo(() => items.filter((item) => `${item.nombre} ${item.descripcion ?? ""}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const revealWhilePressed = async (item: CredencialApi) => {
    pressedCredential.current = item.id;
    try {
      const result = await consultarSecretoCredencial(item.id);
      if (pressedCredential.current === item.id) setRevealed((current) => ({ ...current, [item.id]: result.secreto }));
    } catch (error) { pressedCredential.current = null; show(errorMessage(error), true); }
  };
  const hideSecret = (id: string) => {
    if (pressedCredential.current === id) pressedCredential.current = null;
    setRevealed((current) => { const next = { ...current }; delete next[id]; return next; });
  };

  if (!unlocked) return <Unlock onUnlock={async (password) => { try { await verificarAccesoCredenciales(password); setUnlocked(true); show("Módulo desbloqueado por 15 minutos."); } catch (error) { show(errorMessage(error), true); } }} notice={notice} bad={bad} />;

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Credenciales operativas</h1><p>Mantenga presionado el ojo para ver temporalmente una contraseña.</p></div><button className="button-primary" onClick={() => { setSelected(null); setModal("new"); }}>+ Nueva credencial</button></section>
    {notice && <div className={`${styles.notice}${bad ? ` ${styles.noticeError}` : ""}`}>{notice}<button onClick={() => setNotice(null)}>×</button></div>}
    <section className={styles.contentCard}><div className={styles.toolbar}><label className={styles.search}><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o descripción" /></label><span className={styles.resultCount}>{visible.length} resultado(s)</span></div><div className="table-wrap"><table className={styles.credentialsTable}><thead><tr><th>Credencial</th><th>Descripción</th><th>Contraseña</th><th>Autorizados</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td><strong>{item.nombre}</strong>{item.usuario && <small>{item.usuario}</small>}</td><td>{item.descripcion || <span className={styles.emptyValue}>Sin descripción</span>}</td><td><div className={styles.passwordCell}><code>{revealed[item.id] ?? "••••••••••••"}</code><button type="button" aria-label={`Mantener presionado para ver la contraseña de ${item.nombre}`} title="Mantenga presionado para ver" onPointerDown={() => void revealWhilePressed(item)} onPointerUp={() => hideSecret(item.id)} onPointerCancel={() => hideSecret(item.id)} onPointerLeave={() => hideSecret(item.id)} onContextMenu={(event) => event.preventDefault()}>◉</button></div></td><td><span className={styles.accessCount}>{item.accesos.filter((access) => access.puedeVer).length} usuario(s) · {item.rolesAutorizados.length} rol(es)</span></td><td><span className={`${styles.status} ${item.estado === "ACTIVA" ? styles.statusActive : styles.statusInactive}`}><i />{item.estado === "ACTIVA" ? "Activa" : "Inactiva"}</span></td><td><div className={styles.actions}><button onClick={() => { setSelected(item); setModal("change-password"); }}>Cambiar contraseña</button><button onClick={() => { setSelected(item); setModal("roles"); }}>Autorizados</button><button onClick={() => { setSelected(item); setModal("edit"); }}>Editar</button><button className={styles.dangerAction} onClick={() => { setSelected(item); setModal("delete"); }}>Eliminar</button></div></td></tr>)}{!visible.length && <tr><td colSpan={6} className={styles.emptyTable}>No hay credenciales registradas.</td></tr>}</tbody></table></div></section>
    {modal === "new" && <CredentialForm onClose={() => setModal(null)} onSave={(data) => run(() => crearCredencial(data), "Credencial creada correctamente.")} />}
    {modal === "edit" && selected && <CredentialForm item={selected} onClose={() => setModal(null)} onSave={(data) => run(() => actualizarCredencial(selected.id, data), "Credencial actualizada correctamente.")} />}
    {modal === "change-password" && selected && <ChangePasswordForm item={selected} onClose={() => setModal(null)} onSave={(data) => run(() => cambiarContrasenaCredencial(selected.id, data), "Contraseña actualizada correctamente.")} />}
    {modal === "delete" && selected && <DeleteForm item={selected} onClose={() => setModal(null)} onDelete={(password) => run(() => eliminarCredencial(selected.id, password), "Credencial eliminada correctamente.")} />}
    {modal === "roles" && selected && <RolesForm item={selected} roles={roles} onLoad={async () => setRoles(await listarRolesParaCredenciales())} onClose={() => setModal(null)} onSave={(ids) => run(() => actualizarRolesCredencial(selected.id, ids), "Roles autorizados actualizados.")} />}
  </>;
}

function Dialog(props: { title: string; children: ReactNode; onClose?: () => void }) { return <div className={styles.backdrop}><section className={styles.dialog}><header><h2>{props.title}</h2>{props.onClose && <button type="button" onClick={props.onClose}>×</button>}</header>{props.children}</section></div>; }

function Unlock(props: { onUnlock: (value: string) => Promise<void>; notice: string | null; bad: boolean }) {
  const [value, setValue] = useState("");
  return <Dialog title="Acceso protegido"><form onSubmit={(event) => { event.preventDefault(); void props.onUnlock(value); }}><p className={styles.revealPending}><strong>Confirma tu contraseña para entrar</strong><span>El módulo se desbloqueará durante 15 minutos.</span></p><label className={styles.singleField}><span>Contraseña de la sesión</span><input autoFocus type="password" value={value} onChange={(event) => setValue(event.target.value)} required /></label>{props.notice && <p className={props.bad ? styles.noticeError : styles.notice}>{props.notice}</p>}<footer><button className="button-primary">Entrar al módulo</button></footer></form></Dialog>;
}

type CredentialData = { nombre: string; usuario?: string; secreto?: string; descripcion?: string; estado?: "ACTIVA" | "INACTIVA" };
function CredentialForm(props: { item?: CredencialApi; onClose: () => void; onSave: (data: CredentialData) => Promise<void> }) {
  const [name, setName] = useState(props.item?.nombre ?? ""); const [username, setUsername] = useState(props.item?.usuario ?? ""); const [initialSecret, setInitialSecret] = useState(""); const [description, setDescription] = useState(props.item?.descripcion ?? ""); const [status, setStatus] = useState<"ACTIVA" | "INACTIVA">(props.item?.estado ?? "ACTIVA"); const [saving, setSaving] = useState(false);
  return <Dialog title={props.item ? "Editar credencial" : "Nueva credencial"} onClose={props.onClose}><form onSubmit={async (event) => { event.preventDefault(); setSaving(true); try { await props.onSave({ nombre: name.trim(), usuario: username.trim() || undefined, ...(!props.item && { secreto: initialSecret }), descripcion: description.trim() || undefined, estado: status }); } catch { setSaving(false); } }}><div className={styles.formGrid}><label><span>Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label><label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value as "ACTIVA" | "INACTIVA")}><option value="ACTIVA">Activa</option><option value="INACTIVA">Inactiva</option></select></label><label className={styles.wideField}><span>Usuario de la credencial</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Usuario o correo de acceso" /></label>{!props.item && <label className={styles.wideField}><span>Contraseña inicial *</span><input type="password" value={initialSecret} onChange={(event) => setInitialSecret(event.target.value)} required /></label>}<label className={styles.wideField}><span>Descripción</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></label></div><footer><button type="button" className={styles.dialogCancel} onClick={props.onClose} disabled={saving}>Cancelar</button><button className="button-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button></footer></form></Dialog>;
}

function ChangePasswordForm(props: { item: CredencialApi; onClose: () => void; onSave: (data: { contrasenaUsuario: string; secretoActual: string; secretoNuevo: string }) => Promise<void> }) {
  const [accountPassword, setAccountPassword] = useState(""); const [currentSecret, setCurrentSecret] = useState(""); const [newSecret, setNewSecret] = useState(""); const [confirmation, setConfirmation] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  return <Dialog title={`Cambiar contraseña · ${props.item.nombre}`} onClose={props.onClose}><form onSubmit={async (event) => { event.preventDefault(); if (newSecret !== confirmation) { setError("La confirmación no coincide con la nueva contraseña."); return; } setSaving(true); setError(null); try { await props.onSave({ contrasenaUsuario: accountPassword, secretoActual: currentSecret, secretoNuevo: newSecret }); } catch (reason) { setError(errorMessage(reason)); setSaving(false); } }}><p className={styles.revealPending}><strong>Confirmación protegida</strong><span>Debe validar su identidad y conocer la contraseña anterior de esta credencial.</span></p><div className={styles.formGrid}><label className={styles.wideField}><span>Contraseña de su usuario *</span><input type="password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} required autoFocus autoComplete="current-password" /></label><label className={styles.wideField}><span>Contraseña antigua de la credencial *</span><input type="password" value={currentSecret} onChange={(event) => setCurrentSecret(event.target.value)} required /></label><label><span>Nueva contraseña *</span><input type="password" value={newSecret} onChange={(event) => setNewSecret(event.target.value)} required /></label><label><span>Confirmar nueva contraseña *</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label></div>{error && <p className={styles.inlineError}>{error}</p>}<footer><button type="button" className={styles.dialogCancel} onClick={props.onClose} disabled={saving}>Cancelar</button><button className="button-primary" disabled={saving}>{saving ? "Cambiando…" : "Cambiar contraseña"}</button></footer></form></Dialog>;
}

function DeleteForm(props: { item: CredencialApi; onClose: () => void; onDelete: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState(""); const [deleting, setDeleting] = useState(false); const [error, setError] = useState<string | null>(null);
  return <Dialog title={`Eliminar ${props.item.nombre}`} onClose={props.onClose}><form onSubmit={async (event) => { event.preventDefault(); setDeleting(true); setError(null); try { await props.onDelete(password); } catch (reason) { setError(errorMessage(reason)); setDeleting(false); } }}><p className={styles.deleteWarning}><strong>Esta acción elimina definitivamente la credencial.</strong><span>Ingrese nuevamente la contraseña de su usuario para confirmar.</span></p><label className={styles.singleField}><span>Contraseña de su usuario *</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus autoComplete="current-password" /></label>{error && <p className={styles.inlineError}>{error}</p>}<footer><button type="button" className={styles.dialogCancel} onClick={props.onClose} disabled={deleting}>Cancelar</button><button className={styles.deleteButton} disabled={deleting}>{deleting ? "Eliminando…" : "Eliminar credencial"}</button></footer></form></Dialog>;
}

function RolesForm(props: { item: CredencialApi; roles: RolApi[]; onLoad: () => Promise<void>; onClose: () => void; onSave: (ids: string[]) => Promise<void> }) {
  const [ids, setIds] = useState(props.item.rolesAutorizados.map((role) => role.rolId)); const onLoad = useRef(props.onLoad); useEffect(() => { void onLoad.current(); }, []);
  return <Dialog title="Roles autorizados" onClose={props.onClose}><form onSubmit={(event) => { event.preventDefault(); void props.onSave(ids); }}><div className={styles.roleChoices}>{props.roles.map((role) => <label className={styles.checkLine} key={role.id}><input type="checkbox" checked={ids.includes(role.id)} onChange={(event) => setIds(event.target.checked ? [...ids, role.id] : ids.filter((id) => id !== role.id))} />{role.nombre}</label>)}</div><footer><button type="button" className={styles.dialogCancel} onClick={props.onClose}>Cancelar</button><button className="button-primary">Guardar roles</button></footer></form></Dialog>;
}
