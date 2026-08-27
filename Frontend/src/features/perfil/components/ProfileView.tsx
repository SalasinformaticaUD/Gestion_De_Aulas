"use client";

import { useEffect, useRef, useState } from "react";
import { applyTheme, defaultProfile, getInitials, loadProfile, loadTheme, saveProfile, type ThemePreference, type UserProfile } from "@/features/perfil/lib/profile";
import { obtenerSesion } from "@/features/auth/lib/sesion";
import styles from "./ProfileView.module.css";

export function ProfileView() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const local=loadProfile();const usuario=obtenerSesion()?.usuario;setProfile(usuario?{...local,fullName:usuario.nombreCompleto,email:usuario.correo,username:usuario.nombreUsuario,role:usuario.cargo??usuario.roles.join(", "),department:usuario.dependencia?.nombre??"Sin dependencia"}:local);setTheme(loadTheme()); }, []);

  const selectTheme = (next: ThemePreference) => { setTheme(next); applyTheme(next); };
  const updatePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Seleccione un archivo de imagen válido."); return; }
    if (file.size > 2 * 1024 * 1024) { setPhotoError("La imagen no puede superar 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...profile, photo: String(reader.result) };
      setProfile(next);
      saveProfile(next);
      setPhotoError(null);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const removePhoto = () => {
    const { photo: _photo, ...withoutPhoto } = profile;
    setProfile(withoutPhoto);
    saveProfile(withoutPhoto);
    setPhotoError(null);
  };

  return <>
    <section className={`page-heading ${styles.heading}`}><div><h1>Mi perfil</h1><p>Administre su imagen, seguridad y preferencias de visualización.</p></div><span className={styles.accountStatus}><i />Cuenta activa</span></section>
    <div className={styles.layout}>
      <aside className={styles.identityCard}>
        <div className={styles.photoArea}><div className={styles.photo} role="img" aria-label={`Foto de ${profile.fullName}`} style={profile.photo ? { backgroundImage: `url("${profile.photo}")` } : undefined}>{!profile.photo && <span>{getInitials(profile.fullName)}</span>}</div><button type="button" onClick={() => inputRef.current?.click()}>{profile.photo ? "Cambiar foto" : "Agregar foto"}</button>{profile.photo && <button type="button" className={styles.removePhoto} onClick={removePhoto}>Eliminar foto</button>}<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={updatePhoto} hidden /><small>JPG, PNG o WebP · máximo 2 MB</small>{photoError && <p role="alert">{photoError}</p>}</div><div className={styles.identityCopy}><h2>{profile.fullName}</h2><span>{profile.role}</span><small>@{profile.username}</small></div><div className={styles.identityMeta}><span><b>Dependencia</b>{profile.department}</span><span><b>Estado</b><i>Activo</i></span></div>
      </aside>
      <div className={styles.sections}>
        <section className={styles.profileSection}><header><div><span>01</span><div><h2>Información personal</h2><p>Datos asociados a su cuenta institucional.</p></div></div><b>Solo lectura</b></header><div className={styles.dataGrid}><DataItem label="Nombre completo" value={profile.fullName} /><DataItem label="Correo institucional" value={profile.email} /><DataItem label="Nombre de usuario" value={profile.username} mono /><DataItem label="Cargo" value={profile.role} /></div><aside className={styles.backendNote}></aside></section>
        <PasswordSection notice={passwordNotice} onNotice={setPasswordNotice} />
        <section className={styles.profileSection}><header><div><span>03</span><div><h2>Apariencia</h2><p>Elija cómo se presenta la interfaz en este dispositivo.</p></div></div><b>Guardado local</b></header><div className={styles.themeOptions}><button type="button" className={theme === "light" ? styles.selectedTheme : ""} onClick={() => selectTheme("light")}><span className={styles.lightPreview}><i /><i /><i /></span><strong>Modo claro</strong><small>Fondos luminosos y alto contraste</small><b>{theme === "light" ? "✓ Activo" : "Seleccionar"}</b></button><button type="button" className={theme === "dark" ? styles.selectedTheme : ""} onClick={() => selectTheme("dark")}><span className={styles.darkPreview}><i /><i /><i /></span><strong>Modo oscuro</strong><small>Reduce el brillo de la interfaz</small><b>{theme === "dark" ? "✓ Activo" : "Seleccionar"}</b></button></div></section>
      </div>
    </div>
  </>;
}

function DataItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><span>{label}</span><strong className={mono ? styles.mono : ""}>{value}</strong></div>;
}

function PasswordSection({ notice, onNotice }: { notice: string | null; onNotice: (value: string | null) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = Boolean(confirmPassword) && newPassword !== confirmPassword;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword || newPassword.length < 10 || mismatch) return;
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    onNotice("El backend actual todavía no expone un endpoint para cambiar la contraseña. No se envió ni almacenó ningún valor.");
  };
  return <section className={styles.profileSection}><header><div><span>02</span><div><h2>Cambiar contraseña</h2><p>Utilice una clave institucional segura y diferente a la actual.</p></div></div><b>Operación protegida</b></header><form className={styles.passwordForm} onSubmit={submit}><label><span>Contraseña actual</span><input type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); onNotice(null); }} autoComplete="current-password" required /></label><div><label><span>Nueva contraseña</span><input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); onNotice(null); }} minLength={10} maxLength={128} autoComplete="new-password" required /><small>Mínimo 10 caracteres.</small></label><label><span>Confirmar contraseña</span><input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); onNotice(null); }} minLength={10} maxLength={128} autoComplete="new-password" required />{mismatch && <small className={styles.fieldError}>Las contraseñas no coinciden.</small>}</label></div>{notice && <p className={styles.passwordSuccess} role="status">✓ {notice}</p>}<footer><button type="submit" className="button-primary" disabled={!currentPassword || newPassword.length < 10 || mismatch}>Actualizar contraseña</button></footer></form></section>;
}
