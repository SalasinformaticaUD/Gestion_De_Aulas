"use client";

import { useMemo, useState } from "react";
import { credentialUsers, initialCredentials } from "@/features/credenciales/data/credentials";
import type { CredentialAccess, OperationalCredential } from "@/features/credenciales/types";
import styles from "./CredentialsView.module.css";

type View = "credenciales" | "accesos";
const categories = ["Infraestructura", "Licenciamiento", "Servicios institucionales", "Bases de datos", "Seguridad"];

export function CredentialsView() {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [view, setView] = useState<View>("credenciales");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [editor, setEditor] = useState<OperationalCredential | "new" | null>(null);
  const [accessEditor, setAccessEditor] = useState<OperationalCredential | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleCredentials = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return credentials.filter((credential) =>
      (categoryFilter === "todas" || credential.category === categoryFilter) &&
      (statusFilter === "todas" || credential.status === statusFilter) &&
      (!normalized || `${credential.code} ${credential.name} ${credential.category} ${credential.username ?? ""} ${credential.description ?? ""}`.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [categoryFilter, credentials, query, statusFilter]);

  const saveCredential = (payload: Omit<OperationalCredential, "id" | "code" | "createdAt" | "updatedAt" | "access">, item?: OperationalCredential) => {
    if (item) {
      setCredentials((current) => current.map((credential) => credential.id === item.id ? { ...credential, ...payload, updatedAt: "2026-08-25T21:40:00-05:00" } : credential));
      setNotice(`${item.code} fue actualizada sin exponer su secreto.`);
    } else {
      const nextNumber = Math.max(...credentials.map((credential) => Number(credential.code.slice(-4)))) + 1;
      const next: OperationalCredential = { ...payload, id: `a0000000-0000-4000-8000-${String(nextNumber).padStart(12, "0")}`, code: `CRD-2026-${String(nextNumber).padStart(4, "0")}`, createdAt: "2026-08-25T21:40:00-05:00", updatedAt: "2026-08-25T21:40:00-05:00", access: [] };
      setCredentials((current) => [next, ...current]);
      setNotice(`${next.code} fue creada. El secreto se recibió una sola vez y no se conserva en el frontend.`);
    }
    setEditor(null);
  };

  const toggleStatus = (item: OperationalCredential) => {
    const status = item.status === "ACTIVA" ? "INACTIVA" : "ACTIVA";
    setCredentials((current) => current.map((credential) => credential.id === item.id ? { ...credential, status, updatedAt: "2026-08-25T21:40:00-05:00" } : credential));
    setNotice(`${item.code} cambió a estado ${status.toLocaleLowerCase("es")}.`);
  };

  const saveAccess = (item: OperationalCredential, access: CredentialAccess[]) => {
    setCredentials((current) => current.map((credential) => credential.id === item.id ? { ...credential, access, updatedAt: "2026-08-25T21:40:00-05:00" } : credential));
    setAccessEditor(null);
    setNotice(`Permisos de ${item.code} actualizados para ${access.length} usuario(s).`);
  };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Credenciales Operativas</h1><p>Administración segura de cuentas institucionales y permisos de acceso.</p></div><button type="button" className="button-primary" onClick={() => setEditor("new")}>+ Nueva credencial</button></section>

    

    <section className={styles.metrics} aria-label="Resumen de credenciales operativas">
      <Metric label="Credenciales" value={credentials.length} detail="Metadatos registrados" tone="red" />
      <Metric label="Activas" value={credentials.filter((item) => item.status === "ACTIVA").length} detail="Disponibles para uso" tone="green" />
      <Metric label="Inactivas" value={credentials.filter((item) => item.status === "INACTIVA").length} detail="Acceso suspendido" tone="neutral" />
      <Metric label="Usuarios autorizados" value={new Set(credentials.flatMap((item) => item.access.map((access) => access.userId))).size} detail="Con acceso asignado" tone="blue" />
    </section>

    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button></div>}

    <div className={styles.viewTabs} role="tablist" aria-label="Vistas de credenciales"><button type="button" role="tab" aria-selected={view === "credenciales"} className={view === "credenciales" ? styles.activeTab : ""} onClick={() => setView("credenciales")}>Credenciales <span>{credentials.length}</span></button><button type="button" role="tab" aria-selected={view === "accesos"} className={view === "accesos" ? styles.activeTab : ""} onClick={() => setView("accesos")}>Control de accesos <span>{credentials.reduce((total, item) => total + item.access.length, 0)}</span></button></div>

    {view === "credenciales" ? <section className={styles.contentCard}><div className={styles.toolbar}><label className={styles.search}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, usuario, categoría o código..." aria-label="Buscar credenciales" /></label><label><span>Categoría</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="todas">Todas</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label><span>Estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todas">Todos</option><option value="ACTIVA">Activas</option><option value="INACTIVA">Inactivas</option></select></label><span className={styles.resultCount}>{visibleCredentials.length} resultado(s)</span></div><div className="table-wrap"><table className={styles.credentialsTable}><thead><tr><th>Credencial</th><th>Categoría</th><th>Usuario</th><th>Secreto</th><th>Accesos</th><th>Estado</th><th>Actualización</th><th>Acciones</th></tr></thead><tbody>{visibleCredentials.map((item) => <CredentialRow key={item.id} item={item} onEdit={() => setEditor(item)} onAccess={() => setAccessEditor(item)} onToggle={() => toggleStatus(item)} />)}{visibleCredentials.length === 0 && <tr><td colSpan={8} className={styles.emptyTable}>No hay credenciales para los filtros seleccionados.</td></tr>}</tbody></table></div></section> : <AccessView credentials={credentials} onEdit={setAccessEditor} />}

    
    {editor && <CredentialDialog item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={saveCredential} />}
    {accessEditor && <AccessDialog item={accessEditor} onClose={() => setAccessEditor(null)} onSave={saveAccess} />}
  </>;
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>;
}

function CredentialRow({ item, onEdit, onAccess, onToggle }: { item: OperationalCredential; onEdit: () => void; onAccess: () => void; onToggle: () => void }) {
  return <tr><td><strong>{item.name}</strong><small>{item.code}</small></td><td><span className={styles.category}>{item.category}</span></td><td>{item.username ? <code>{item.username}</code> : <span className={styles.emptyValue}>No registrado</span>}</td><td><span className={styles.protectedSecret}><i aria-hidden="true">●●●●●●●●</i><small>Protegido</small></span></td><td><button type="button" className={styles.accessCount} onClick={onAccess}>{item.access.length} usuario(s)</button></td><td><span className={`${styles.status} ${item.status === "ACTIVA" ? styles.statusActive : styles.statusInactive}`}><i />{item.status === "ACTIVA" ? "Activa" : "Inactiva"}</span></td><td><time>{formatDate(item.updatedAt)}</time></td><td><div className={styles.actions}><button type="button" onClick={onEdit}>Editar</button><button type="button" onClick={onToggle}>{item.status === "ACTIVA" ? "Desactivar" : "Activar"}</button></div></td></tr>;
}

function AccessView({ credentials, onEdit }: { credentials: OperationalCredential[]; onEdit: (item: OperationalCredential) => void }) {
  return <section className={styles.accessCard}><header><div><h2>Accesos asignados</h2><p>Usuarios autorizados para consultar o editar cada credencial.</p></div><span>{credentials.reduce((total, item) => total + item.access.length, 0)} asignaciones</span></header><div className={styles.accessGrid}>{credentials.map((credential) => <article key={credential.id}><header><div><strong>{credential.name}</strong><small>{credential.code} · {credential.category}</small></div><button type="button" onClick={() => onEdit(credential)}>Administrar</button></header><div>{credential.access.map((access) => {
    const user = credentialUsers.find((item) => item.id === access.userId);
    return user && <span key={access.userId}><b>{user.initials}</b><i><strong>{user.name}</strong><small>{user.role}</small></i><em className={access.canEdit ? styles.permissionEdit : styles.permissionView}>{access.canEdit ? "Puede editar" : "Solo consulta"}</em></span>;
  })}{credential.access.length === 0 && <p>Sin usuarios autorizados.</p>}</div></article>)}</div></section>;
}

function CredentialDialog({ item, onClose, onSave }: { item?: OperationalCredential; onClose: () => void; onSave: (payload: Omit<OperationalCredential, "id" | "code" | "createdAt" | "updatedAt" | "access">, item?: OperationalCredential) => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? categories[0]);
  const [username, setUsername] = useState(item?.username ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [secret, setSecret] = useState("");
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!item && !secret) return; onSave({ name: name.trim(), category, username: username.trim() || undefined, description: description.trim() || undefined, status: item?.status ?? "ACTIVA" }, item); setSecret(""); };
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="credential-dialog-title"><header><div><span>Metadatos protegidos</span><h2 id="credential-dialog-title">{item ? "Editar credencial" : "Nueva credencial"}</h2><p>{item ? "El secreto existente nunca se recupera durante la edición." : "El secreto se recibe únicamente para enviarlo al servicio de cifrado."}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={submit}><div className={styles.formGrid}><label><span>Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} required autoFocus placeholder="Ej. Administración de red" /></label><label><span>Categoría</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className={styles.wideField}><span>Usuario <small>Opcional</small></span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" placeholder="Cuenta o correo institucional" /></label>{!item && <label className={styles.wideField}><span>Secreto <small>No se conservará en el navegador</small></span><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="new-password" required placeholder="Contraseña, token o clave de acceso" /></label>}<label className={styles.wideField}><span>Descripción <small>Opcional</small></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Finalidad y condiciones de uso..." /></label></div><div className={styles.secretWarning}><span aria-hidden="true">▣</span><p><strong>Tratamiento seguro:</strong> el valor secreto no se incorpora al estado persistente de esta vista ni se vuelve a mostrar después del registro.</p></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={!name.trim() || (!item && !secret)}>{item ? "Guardar metadatos" : "Crear credencial"}</button></footer></form></section></div>;
}

function AccessDialog({ item, onClose, onSave }: { item: OperationalCredential; onClose: () => void; onSave: (item: OperationalCredential, access: CredentialAccess[]) => void }) {
  const [access, setAccess] = useState(item.access);
  const update = (userId: string, mode: "none" | "view" | "edit") => setAccess((current) => mode === "none" ? current.filter((entry) => entry.userId !== userId) : [...current.filter((entry) => entry.userId !== userId), { userId, canView: true, canEdit: mode === "edit" }]);
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`${styles.dialog} ${styles.accessDialog}`} role="dialog" aria-modal="true" aria-labelledby="access-dialog-title"><header><div><span>Permisos por usuario</span><h2 id="access-dialog-title">Accesos a {item.name}</h2><p>Asigne consulta de metadatos o edición de la credencial.</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={(event) => { event.preventDefault(); onSave(item, access); }}><div className={styles.userPermissions}>{credentialUsers.map((user) => {
    const current = access.find((entry) => entry.userId === user.id);
    const value = !current ? "none" : current.canEdit ? "edit" : "view";
    return <label key={user.id}><b>{user.initials}</b><span><strong>{user.name}</strong><small>{user.role}</small></span><select value={value} onChange={(event) => update(user.id, event.target.value as "none" | "view" | "edit")}><option value="none">Sin acceso</option><option value="view">Solo consulta</option><option value="edit">Puede editar</option></select></label>;
  })}</div><div className={styles.revealPending}><strong>Revelado de secretos no disponible</strong><span>El permiso de revelado requiere un contrato independiente y auditoría; no equivale a “Solo consulta”.</span></div><footer><button type="button" className={styles.dialogCancel} onClick={onClose}>Cancelar</button><button type="submit" className="button-primary">Guardar accesos</button></footer></form></section></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(new Date(value));
}
