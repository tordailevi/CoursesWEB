"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { user: { username: string } | null };
        if (data.user) {
          router.replace("/courses");
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    }
    void checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sikertelen belépés.");
        return;
      }
      router.push("/courses");
    } catch {
      setError("Hálózati hiba belépés közben.");
    }
  }

  return (
    <div className="card">
      <h1>Belépés</h1>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        Jelentkezz be, hogy a haladásod több eszközön is megmaradjon.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem" }}
      >
        <div>
          <label className="field-label" htmlFor="username">
            Felhasználónév
          </label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="password">
            Jelszó
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem" }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Elrejtés" : "Megjelenítés"}
            </button>
          </div>
        </div>
        {error && (
          <p style={{ color: "#fecaca", fontSize: "0.85rem" }}>{error}</p>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ marginTop: "0.4rem" }}
          disabled={checking}
        >
          {checking ? "Munkamenet ellenőrzése..." : "Belépés"}
        </button>
      </form>
    </div>
  );
}

