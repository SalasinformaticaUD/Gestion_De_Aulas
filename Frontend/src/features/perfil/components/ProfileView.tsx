"use client";

import { useEffect, useRef, useState } from "react";
import { defaultProfile, getInitials, profileFromSession, type UserProfile } from "@/features/perfil/lib/profile";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import { actualizarFotoPerfil, cambiarContrasenaActual } from "@/features/auth/api/authApi";
import styles from "./ProfileView.module.css";

export function ProfileView() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [session, setSession] = useState<ReturnType<typeof obtenerSesion>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    setSession(sesion);
    const usuario = sesion?.usuario;
    setProfile(usuario ? profileFromSession(usuario) : defaultProfile);
  }, []);
  const updatePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Seleccione un archivo de imagen válido."); return; }
    if (file.size > 2 * 1024 * 1024) { setPhotoError("La imagen no puede superar 2 MB."); return; }
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
        <div className={styles.photoArea}><div className={styles.photo} role="img" aria-label={`Foto de ${profile.fullName}`} style={profile.photo ? { backgroundImage: `url("${profile.photo}")` } : undefined}>{!profile.photo && <span>{getInitials(profile.fullName)}</span>}</div><button type="button" disabled={updatingPhoto} onClick={() => inputRef.current?.click()}>{updatingPhoto ? "Guardando…" : profile.photo ? "Cambiar foto" : "Agregar foto"}</button>{profile.photo && <button type="button" disabled={updatingPhoto} className={styles.removePhoto} onClick={() => void removePhoto()}>Eliminar foto</button>}<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={updatePhoto} hidden /><small>JPG, PNG o WebP · máximo 2 MB</small>{photoError && <p role="alert">{photoError}</p>}</div><div className={styles.identityCopy}><h2>{profile.fullName}</h2><span>{profile.role}</span><small>@{profile.username}</small></div><div className={styles.identityMeta}><span><b>Dependencia</b>{profile.department}</span><span><b>Estado</b><i>Activo</i></span></div>
      </aside>
      <div className={styles.sections}>
        <section className={styles.profileSection}><header><div><span>01</span><div><h2>Información personal</h2><p>Datos asociados a su cuenta institucional.</p></div></div><b>Solo lectura</b></header><div className={styles.dataGrid}><DataItem label="Nombre completo" value={profile.fullName} /><DataItem label="Correo institucional" value={profile.email} /><DataItem label="Nombre de usuario" value={profile.username} mono /><DataItem label="Cargo" value={profile.role} /></div><aside className={styles.backendNote}></aside></section>
        <section className={styles.profileSection}><header><div><span>03</span><div><h2>Accesos asignados</h2><p>Roles, módulos y permisos entregados por la plataforma central.</p></div></div><b>Gestionado por administración</b></header><div className={styles.accessGrid}><DataItem label="Roles" value={session?.usuario.roles.join(", ") || "Sin roles"} /><AccessList label="Módulos" values={session?.usuario.modulos ?? []} empty="Sin módulos" /><AccessList label="Permisos" values={session?.usuario.permisos ?? []} empty="Sin permisos" wide /></div></section>
        <PasswordSection notice={passwordNotice} onNotice={setPasswordNotice} />
      </div>
    </div>
  </>;
}

function DataItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><span>{label}</span><strong className={mono ? styles.mono : ""}>{value}</strong></div>;
}

function AccessList({ label, values, empty, wide = false }: { label: string; values: string[]; empty: string; wide?: boolean }) {
  return <section className={`${styles.accessList} ${wide ? styles.accessListWide : ""}`}><span>{label}</span>{values.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p>{empty}</p>}</section>;
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
  return <section className={styles.profileSection}><header><div><span>02</span><div><h2>Cambiar contraseña</h2><p>Utilice una clave institucional segura y diferente a la actual.</p></div></div><b>Operación protegida</b></header><form className={styles.passwordForm} onSubmit={submit}><label><span>Contraseña actual</span><input type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); onNotice(null); }} autoComplete="current-password" required /></label><div><label><span>Nueva contraseña</span><input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); onNotice(null); }} minLength={10} maxLength={128} autoComplete="new-password" required /><small>Mínimo 10 caracteres.</small></label><label><span>Confirmar contraseña</span><input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); onNotice(null); }} minLength={10} maxLength={128} autoComplete="new-password" required />{mismatch && <small className={styles.fieldError}>Las contraseñas no coinciden.</small>}</label></div>{notice && <p className={`${styles.passwordSuccess} ${isPasswordError ? styles.passwordError : ""}`} role={isPasswordError ? "alert" : "status"}>{notice}</p>}<footer><button type="submit" className="button-primary" disabled={submitting || !currentPassword || newPassword.length < 10 || mismatch}>{submitting ? "Actualizando…" : "Actualizar contraseña"}</button></footer></form></section>;
}
