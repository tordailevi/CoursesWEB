"use client";

import { useEffect, useState } from "react";

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

type UserRow = {
  id: number;
  username: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = (await meRes.json()) as MeResponse;
        setMe(meData.user);
        if (!meData.user || meData.user.role !== "admin") {
          return;
        }
        const usersRes = await fetch("/api/admin/users");
        const usersData = (await usersRes.json()) as { users: UserRow[] };
        setUsers(usersData.users);
      } catch {
        setError("Failed to load users.");
      }
    }
    void load();
  }, []);

  async function changeRole(id: number, role: "user" | "admin") {
    try {
      setError(null);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update role.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role } : u)),
      );
    } catch {
      setError("Hálózati hiba jogosultság módosítása közben.");
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setError("A felhasználónév és a jelszó megadása kötelező.");
      return;
    }
    try {
      setError(null);
      setCreating(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newIsAdmin ? "admin" : "user",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nem sikerült létrehozni a felhasználót.");
        return;
      }

      const created = data.user as UserRow;
      setUsers((prev) => [...prev, created]);
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
    } catch {
      setError("Hálózati hiba felhasználó létrehozása közben.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(id: number) {
    if (!window.confirm("Biztosan törlöd ezt a felhasználót?")) {
      return;
    }
    try {
      setError(null);
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nem sikerült törölni a felhasználót.");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError("Hálózati hiba felhasználó törlése közben.");
    }
  }

  if (!me) {
    return (
      <div className="card">
        <h1>Admin – Felhasználók</h1>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          A megtekintéshez admin fiókkal kell belépned.
        </p>
      </div>
    );
  }

  if (me.role !== "admin") {
    return (
      <div className="card">
        <h1>Csak adminoknak</h1>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          Felhasználókat csak admin jogosultsággal lehet kezelni.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Felhasználók és jogosultságok</h1>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        Adj vagy vegyél el admin jogosultságot a kurzuskezeléshez.
      </p>
      {error && (
        <p style={{ color: "#fecaca", fontSize: "0.85rem", marginTop: "0.4rem" }}>
          {error}
        </p>
      )}
      <form
        onSubmit={createUser}
        style={{
          marginTop: "1rem",
          marginBottom: "1.1rem",
          padding: "0.8rem 0.9rem",
          borderRadius: "10px",
          border: "1px solid rgba(148, 163, 184, 0.4)",
          backgroundColor: "rgba(15, 23, 42, 0.85)",
          display: "grid",
          gap: "0.6rem",
        }}
      >
        <div
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
          }}
        >
          Felhasználó hozzáadása
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr auto",
            gap: "0.6rem",
            alignItems: "center",
          }}
        >
          <input
            className="input"
            placeholder="Felhasználónév"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Jelszó"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
            }}
          >
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
            />
            Admin
          </label>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "fit-content", marginTop: "0.2rem" }}
          disabled={creating}
        >
          {creating ? "Létrehozás..." : "Felhasználó létrehozása"}
        </button>
      </form>

      <div style={{ marginTop: "0.2rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
              }}
            >
              <th style={{ paddingBottom: "0.4rem" }}>Felhasználónév</th>
              <th style={{ paddingBottom: "0.4rem" }}>Jogosultság</th>
              <th style={{ paddingBottom: "0.4rem" }}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: "0.4rem 0" }}>{u.username}</td>
                <td style={{ padding: "0.4rem 0" }}>{u.role}</td>
                <td style={{ padding: "0.4rem 0" }}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ paddingInline: "0.7rem", fontSize: "0.8rem" }}
                      disabled={u.role === "user"}
                      onClick={() => changeRole(u.id, "user")}
                    >
                      Legyen user
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ paddingInline: "0.7rem", fontSize: "0.8rem" }}
                      disabled={u.role === "admin"}
                      onClick={() => changeRole(u.id, "admin")}
                    >
                      Legyen admin
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ paddingInline: "0.7rem", fontSize: "0.8rem" }}
                      disabled={me.id === u.id}
                      onClick={() => deleteUser(u.id)}
                    >
                      Törlés
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

