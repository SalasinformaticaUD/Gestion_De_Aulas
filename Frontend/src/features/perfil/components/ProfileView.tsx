"use client";

import { useEffect, useRef, useState } from "react";
import { defaultProfile, getInitials, profileFromSession, type UserProfile } from "@/features/perfil/lib/profile";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import { actualizarFotoPerfil, cambiarContrasenaActual, cambiarNombreUsuario } from "@/features/auth/api/authApi";
import styles from "./ProfileView.module.css";
import { nombreDependencia } from "@/features/monitores/api/adaptadoresMonitores";
import { servicioMonitores } from "@/features/monitores/api/servicioMonitores";
import type { RegistrosPersonalesApi } from "@/features/monitores/api/contratosMonitores";
import {
  guardarConfiguracionDistribucionPdf,
  obtenerConfiguracionDistribucionPdf,
  type ConfiguracionDistribucionPdf,
} from "@/features/perfil/api/configuracionDistribucionPdfApi";

export function ProfileView({ mostrarDatosMonitor = false }: { mostrarDatosMonitor?: boolean }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [session, setSession] = useState<ReturnType<typeof obtenerSesion>>(null);
  const [monitorData, setMonitorData] = useState<RegistrosPersonalesApi["monitor"] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    setSession(sesion);
    const usuario = sesion?.usuario;
    setProfile(usuario ? profileFromSession(usuario) : defaultProfile);
  }, []);
  useEffect(() => {
    if (!mostrarDatosMonitor) return;
    let activo = true;
    void servicioMonitores.obtenerPerfilMonitores()
      .then(async (perfil) => perfil.role === "monitor" ? servicioMonitores.obtenerMisRegistros() : null)
      .then((datos) => { if (activo && datos) setMonitorData(datos.monitor); })
      .catch(() => { if (activo) setMonitorData(null); });
    return () => { activo = false; };
  }, [mostrarDatosMonitor]);
  const dependenciaVisible = monitorData ? nombreDependencia(monitorData.department) : profile.department;
  const esAdministradorAulas = session?.aplicacion === "aulas" && session.usuario.roles.some((rol) => rol.trim().toLocaleUpperCase("es") === "ADMINISTRADOR");
  const updatePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setPhotoError("Seleccione un archivo PNG, JPG, WebP o GIF válido."); return; }
    if (file.size > 3 * 1024 * 1024) { setPhotoError("La imagen no puede superar 3 MB."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const photo = String(reader.result);
      setUpdatingPhoto(true);
      try {
        await actualizarFotoPerfil(photo);
        setProfile((current) => ({ ...current, photo }));
        setPhotoError(null);
      } catch (cause) {
        setPhotoError(cause instanceof Error ? cause.message : "No fue posible guardar la foto.");
      } finally {
        setUpdatingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const removePhoto = async () => {
    setUpdatingPhoto(true);
    try {
      await actualizarFotoPerfil(null);
      setProfile((current) => ({ ...current, photo: undefined }));
      setPhotoError(null);
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : "No fue posible eliminar la foto.");
    } finally {
      setUpdatingPhoto(false);
    }
  };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Mi perfil</h1><p>Administre su imagen, seguridad y datos de cuenta.</p></div><span className={styles.accountStatus}><i />Cuenta activa</span></section>
    <div className={styles.layout}>
      <aside className={styles.identityCard}>
        <div className={styles.photoArea}><div className={styles.photo} role="img" aria-label={`Foto de ${profile.fullName}`}>{profile.photo ? <img src={profile.photo} alt="" /> : <span>{getInitials(profile.fullName)}</span>}</div><button type="button" disabled={updatingPhoto} onClick={() => inputRef.current?.click()}>{updatingPhoto ? "Guardando…" : profile.photo ? "Cambiar foto" : "Agregar foto"}</button>{profile.photo && <button type="button" disabled={updatingPhoto} className={styles.removePhoto} onClick={() => void removePhoto()}>Eliminar foto</button>}<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={updatePhoto} hidden /><small>JPG, PNG, WebP o GIF · máximo 3 MB</small>{photoError && <p role="alert">{photoError}</p>}</div><div className={styles.identityCopy}><h2>{profile.fullName}</h2><span>{profile.role}</span><small>@{profile.username}</small></div><div className={styles.identityMeta}><span><b>Dependencia</b>{dependenciaVisible}</span><span><b>Estado</b><i>Activo</i></span></div>
      </aside>
      <div className={styles.sections}>
        <section className={styles.profileSection}><header><div><span>01</span><div><h2>Información personal</h2><p>{monitorData ? "Datos institucionales y académicos asociados a su monitoría." : "Datos asociados a su cuenta institucional."}</p></div></div><b>Solo lectura</b></header><div className={styles.dataGrid}><DataItem label="Nombre completo" value={profile.fullName} /><DataItem label="Correo institucional" value={profile.email} /><DataItem label="Nombre de usuario" value={profile.username} mono /><DataItem label="Cargo" value={profile.role} />{monitorData && <><DataItem label="Código estudiantil" value={monitorData.codigo_estudiante || "Sin código registrado"} mono /><DataItem label="Semestre académico" value={monitorData.semester || "Sin semestre asociado"} /><DataItem label="Número de documento" value={monitorData.numero_documento || "Sin documento registrado"} mono /><DataItem label="Proyecto curricular" value={monitorData.proyecto_curricular_label || "Sin proyecto registrado"} /><DataItem label="Teléfono" value={monitorData.telefono || "Sin teléfono registrado"} /><DataItem label="Dependencia de monitoría" value={nombreDependencia(monitorData.department)} /></>}</div><aside className={styles.backendNote}><span>i</span><p><strong>Perfil centralizado.</strong> La foto, el nombre de usuario y la contraseña se comparten en Gestión de Aulas y Gestión de Monitores.</p></aside>{monitorData && <aside className={`${styles.backendNote} ${styles.monitorEditNote}`}><span>i</span><p><strong>Datos de monitoría protegidos.</strong> Para corregir o actualizar sus datos de monitor, comuníquese con su líder de área.</p></aside>}</section>
        {esAdministradorAulas && <PdfDistributionSection />}
        <UsernameSection username={profile.username} onChanged={(nombreUsuario) => setProfile((current) => ({ ...current, username: nombreUsuario }))} />
        <section className={styles.profileSection}><header><div><span>04</span><div><h2>Accesos asignados</h2><p>Roles, módulos y permisos entregados por la plataforma central.</p></div></div><b>Gestionado por administración</b></header><div className={styles.accessGrid}><DataItem label="Roles" value={session?.usuario.roles.join(", ") || "Sin roles"} /><AccessList label="Módulos" values={session?.usuario.modulos ?? []} empty="Sin módulos" /><AccessList label="Permisos" values={session?.usuario.permisos ?? []} empty="Sin permisos" wide /></div></section>
        <PasswordSection notice={passwordNotice} onNotice={setPasswordNotice} />
      </div>
    </div>
  </>;
}

function PdfDistributionSection() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [configuracion, setConfiguracion] = useState<ConfiguracionDistribucionPdf | null>(null);
  const [activa, setActiva] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void obtenerConfiguracionDistribucionPdf()
      .then((datos) => {
        if (!vigente) return;
        setConfiguracion(datos);
        setActiva(datos.activa);
        setSeleccionados(datos.usuarioIds);
      })
      .catch(() => undefined);
    return () => { vigente = false; };
  }, []);

  const abrir = async () => {
    setModalAbierto(true);
    setCargando(true);
    setError(null);
    setMensaje(null);
    try {
      const datos = await obtenerConfiguracionDistribucionPdf();
      setConfiguracion(datos);
      setActiva(datos.activa);
      setSeleccionados(datos.usuarioIds);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar la configuración.");
    } finally {
      setCargando(false);
    }
  };

  const alternarUsuario = (id: string) => {
    setSeleccionados((actuales) => actuales.includes(id) ? actuales.filter((actual) => actual !== id) : [...actuales, id]);
    setError(null);
  };

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (activa && !seleccionados.length) {
      setError("Seleccione al menos un usuario para activar la distribución.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const actualizada = await guardarConfiguracionDistribucionPdf(activa, seleccionados);
      setConfiguracion(actualizada);
      setActiva(actualizada.activa);
      setSeleccionados(actualizada.usuarioIds);
      setMensaje(actualizada.activa ? `Distribución activa entre ${actualizada.usuarioIds.length} usuario(s).` : "Distribución desactivada. Los PDFs conservarán el responsable original.");
      setModalAbierto(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  };

  return <>
    <section className={styles.profileSection}>
      <header><div><span>PDF</span><div><h2>Distribución de atenciones en PDF</h2><p>Configuración exclusiva para Préstamos de Videobeam y Prácticas Libres.</p></div></div><b>{configuracion?.activa ? "Activa" : "Opcional"}</b></header>
      <div className={styles.pdfDistributionSummary}>
        <div><strong>{configuracion?.activa ? "Reparto equitativo activado" : "Responsables originales"}</strong><p>{configuracion?.activa ? `${configuracion.usuarioIds.length} usuario(s) participan en la distribución.` : "Los documentos muestran a la persona registrada originalmente."}</p></div>
        <button type="button" className="button-primary" onClick={() => void abrir()}>Configurar reparto de PDFs</button>
      </div>
      {mensaje && <p className={styles.pdfDistributionNotice} role="status">{mensaje}</p>}
    </section>
    {modalAbierto && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalAbierto(false)}><section className={styles.pdfDistributionModal} role="dialog" aria-modal="true" aria-labelledby="titulo-distribucion-pdf"><header><div><span>GENERACIÓN DE DOCUMENTOS</span><h2 id="titulo-distribucion-pdf">Distribuir atenciones en los PDFs</h2><p>El cambio solo afecta el nombre mostrado y las carpetas del ZIP. Los registros originales no se modifican.</p></div><button type="button" onClick={() => setModalAbierto(false)} aria-label="Cerrar">×</button></header><form onSubmit={(event) => void guardar(event)}><label className={styles.pdfDistributionToggle}><input type="checkbox" checked={activa} onChange={(event) => { setActiva(event.target.checked); setError(null); }} /><span><strong>Activar distribución equitativa</strong><small>El sobrante se asignará de uno en uno, con una diferencia máxima de un PDF.</small></span></label>{cargando ? <p className={styles.pdfDistributionEmpty}>Cargando usuarios…</p> : <fieldset className={`${styles.pdfUsers} ${!activa ? styles.pdfUsersDisabled : ""}`} disabled={!activa}><legend>{activa ? <>Usuarios que participan <b>{seleccionados.length}</b></> : "Active la distribución para seleccionar usuarios"}</legend>{configuracion?.usuariosDisponibles.length ? configuracion.usuariosDisponibles.map((usuario) => <label key={usuario.id} className={seleccionados.includes(usuario.id) ? styles.pdfUserSelected : ""}><input type="checkbox" checked={seleccionados.includes(usuario.id)} onChange={() => alternarUsuario(usuario.id)} /><span><strong>{usuario.nombreCompleto}</strong><small>@{usuario.nombreUsuario}{usuario.cargo ? ` · ${usuario.cargo}` : ""}</small></span></label>) : <p className={styles.pdfDistributionEmpty}>No hay usuarios operativos disponibles.</p>}</fieldset>}{error && <p className={styles.pdfDistributionError} role="alert">{error}</p>}<footer><button type="button" className={styles.cancelButton} onClick={() => setModalAbierto(false)}>Cancelar</button><button type="submit" className="button-primary" disabled={cargando || guardando || (activa && !seleccionados.length)}>{guardando ? "Guardando…" : "Guardar configuración"}</button></footer></form></section></div>}
  </>;
}

function DataItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><span>{label}</span><strong className={mono ? styles.mono : ""}>{value}</strong></div>;
}

function AccessList({ label, values, empty, wide = false }: { label: string; values: string[]; empty: string; wide?: boolean }) {
  const textoResumen = values.length ? `Mostrar ${values.length} ${label.toLocaleLowerCase()}` : empty;
  return <section className={`${styles.accessList} ${wide ? styles.accessListWide : ""}`}><span>{label}</span><details className={styles.accessDetails}><summary><span>{textoResumen}</span><b aria-hidden="true">⌄</b></summary>{values.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p>{empty}</p>}</details></section>;
}

function UsernameSection({ username, onChanged }: { username: string; onChanged: (nombreUsuario: string) => void }) {
  const [newUsername, setNewUsername] = useState(username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const continueToPassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (newUsername.trim().length >= 3 && newUsername.trim() !== username) { setConfirming(true); setNotice(null); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword) return;
    setSubmitting(true);
    try {
      const response = await cambiarNombreUsuario(newUsername.trim(), currentPassword);
      onChanged(response.nombreUsuario); setCurrentPassword(""); setConfirming(false);
      setNotice("El nombre de usuario fue actualizado en ambos módulos.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No fue posible actualizar el nombre de usuario."); }
    finally { setSubmitting(false); }
  };
  const isError = Boolean(notice) && !notice?.startsWith("El nombre");
  return <section className={styles.profileSection}><header><div><span>02</span><div><h2>Cambiar nombre de usuario</h2><p>Este acceso se sincroniza automáticamente entre Gestión de Aulas y Gestión de Monitores.</p></div></div><b>Operación protegida</b></header><form className={styles.passwordForm} onSubmit={confirming ? submit : continueToPassword}><label><span>Nuevo nombre de usuario</span><input value={newUsername} onChange={(event) => { setNewUsername(event.target.value); setConfirming(false); setNotice(null); }} minLength={3} maxLength={80} autoComplete="username" required /><small>Entre 3 y 80 caracteres.</small></label>{confirming && <label><span>Confirme con su contraseña actual</span><input type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setNotice(null); }} autoComplete="current-password" required autoFocus /></label>}{notice && <p className={`${styles.passwordSuccess} ${isError ? styles.passwordError : ""}`} role={isError ? "alert" : "status"}>{notice}</p>}<footer>{confirming && <button type="button" className={styles.cancelButton} onClick={() => { setConfirming(false); setCurrentPassword(""); }}>Cancelar</button>}<button type="submit" className="button-primary" disabled={submitting || newUsername.trim().length < 3 || newUsername.trim() === username || (confirming && !currentPassword)}>{submitting ? "Actualizando…" : confirming ? "Confirmar cambio" : "Continuar"}</button></footer></form></section>;
}

function PasswordSection({ notice, onNotice }: { notice: string | null; onNotice: (value: string | null) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mismatch = Boolean(confirmPassword) && newPassword !== confirmPassword;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword || newPassword.length < 10 || mismatch) return;
    setSubmitting(true);
    try {
      await cambiarContrasenaActual(currentPassword, newPassword);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      onNotice("La contraseña fue actualizada correctamente.");
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : "No fue posible actualizar la contraseña.");
    } finally { setSubmitting(false); }
  };
  const isPasswordError = notice?.startsWith("La contraseña actual") || notice?.startsWith("No fue posible");
  return <section className={styles.profileSection}><header><div><span>03</span><div><h2>Cambiar contraseña</h2><p>Utilice una clave institucional segura y diferente a la actual.</p></div></div><b>Operación protegida</b></header><form className={styles.passwordForm} onSubmit={submit}><label><span>Contraseña actual</span><input type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); onNotice(null); }} autoComplete="current-password" required /></label><div><label><span>Nueva contraseña</span><input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); onNotice(null); }} minLength={10} maxLength={128} autoComplete="new-password" required /><small>Mínimo 10 caracteres.</small></label><label><span>Confirmar contraseña</span><input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); onNotice(null); }} minLength={10} maxLength={128} autoComplete="new-password" required />{mismatch && <small className={styles.fieldError}>Las contraseñas no coinciden.</small>}</label></div>{notice && <p className={`${styles.passwordSuccess} ${isPasswordError ? styles.passwordError : ""}`} role={isPasswordError ? "alert" : "status"}>{notice}</p>}<footer><button type="submit" className="button-primary" disabled={submitting || !currentPassword || newPassword.length < 10 || mismatch}>{submitting ? "Actualizando…" : "Actualizar contraseña"}</button></footer></form></section>;
}
