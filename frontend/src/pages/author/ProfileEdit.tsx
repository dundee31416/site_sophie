import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import * as meApi from "../../api/me";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

export function ProfileEdit() {
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState<string>("");
  const [color, setColor] = useState("#8c5bd0");
  const [bio, setBio] = useState("");
  const [favo, setFavo] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  useEffect(() => {
    if (user == null) return;
    setDisplayName(user.display_name ?? "");
    setAge(user.age != null ? String(user.age) : "");
    setColor(user.color ?? "#8c5bd0");
    setBio(user.bio ?? "");
    setFavo(user.favo ?? "");
  }, [user]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileErr(null);
    try {
      await meApi.updateProfile({
        display_name: displayName.trim() || null,
        age: age.trim() === "" ? null : Number(age),
        color: color || null,
        bio: bio.trim() || null,
        favo: favo.trim() || null,
      });
      await refresh();
      setProfileMsg("Profil enregistré.");
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setSavingPwd(true);
    setPwdMsg(null);
    setPwdErr(null);
    try {
      await meApi.changePassword(currentPwd, newPwd);
      setCurrentPwd("");
      setNewPwd("");
      setPwdMsg("Mot de passe changé.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setPwdErr("Mot de passe actuel incorrect.");
      } else {
        setPwdErr(err instanceof Error ? err.message : "Erreur");
      }
    } finally {
      setSavingPwd(false);
    }
  }

  async function onAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file == null) return;
    setAvatarUploading(true);
    setAvatarErr(null);
    try {
      await meApi.uploadAvatar(file);
      await refresh();
    } catch (err) {
      setAvatarErr(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAvatarUploading(false);
    }
  }

  if (user == null) return null;

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Mon profil</h1>
        <Link to="/me/dashboard" className="ghost-link">
          ← Tableau de bord
        </Link>
      </div>

      <section className="card stack" style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Avatar</h2>
        <div className="row" style={{ alignItems: "center" }}>
          <div
            className="avatar-preview"
            style={{
              backgroundImage: user.avatar_path ? `url(${user.avatar_path})` : undefined,
            }}
          />
          <div className="stack" style={{ marginLeft: "1rem" }}>
            <label className="ghost-link" style={{ cursor: "pointer", border: "1px solid var(--border)" }}>
              {avatarUploading ? "Envoi…" : "Changer l'image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => void onAvatarChange(e)}
                style={{ display: "none" }}
              />
            </label>
            {avatarErr != null && <div className="error">{avatarErr}</div>}
          </div>
        </div>
      </section>

      <section className="card stack" style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Informations</h2>
        <form onSubmit={onSaveProfile} className="stack">
          <div className="row" style={{ flexWrap: "wrap" }}>
            <label style={{ flex: 2, minWidth: 200 }}>
              Nom affiché
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={128}
              />
            </label>
            <label style={{ flex: 1, minWidth: 120 }}>
              Âge
              <input
                type="number"
                min={0}
                max={150}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </label>
            <label style={{ flex: 1, minWidth: 120 }}>
              Couleur
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ padding: "0.1rem", height: "2.5rem" }}
              />
            </label>
          </div>
          <label>
            Biographie
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
            />
          </label>
          <label>
            Mes favoris
            <textarea
              rows={2}
              value={favo}
              onChange={(e) => setFavo(e.target.value)}
              maxLength={2000}
            />
          </label>
          {profileErr != null && <div className="error">{profileErr}</div>}
          {profileMsg != null && <div style={{ color: "var(--muted)" }}>{profileMsg}</div>}
          <button type="submit" disabled={savingProfile}>
            {savingProfile ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Changer mon mot de passe</h2>
        <form onSubmit={onChangePassword} className="stack" style={{ maxWidth: 360 }}>
          <label>
            Mot de passe actuel
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={4}
              autoComplete="new-password"
            />
          </label>
          {pwdErr != null && <div className="error">{pwdErr}</div>}
          {pwdMsg != null && <div style={{ color: "var(--muted)" }}>{pwdMsg}</div>}
          <button type="submit" disabled={savingPwd}>
            {savingPwd ? "Changement…" : "Changer"}
          </button>
        </form>
      </section>
    </main>
  );
}
