"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function passwordMeetsRules(password: string) {
  return /[A-Z]/.test(password) && /\d/.test(password);
}

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    if (password !== confirmPassword) {
      setError("A két jelszó nem egyezik.");
      return;
    }
    if (!passwordMeetsRules(password)) {
      setError("A jelszónak tartalmaznia kell legalább 1 nagybetűt és 1 számot.");
      return;
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sikertelen regisztráció.");
        return;
      }
      router.push("/courses");
    } catch {
      setError("Hálózati hiba regisztráció közben.");
    }
  }

  return (
    <div className="card">
      <h1>Fiók létrehozása</h1>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        Regisztrálj, hogy a haladásod szinkronban maradjon, és ahol engedélyezett,
        elérd az admin funkciókat.
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
              autoComplete="new-password"
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
          <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.8rem" }}>
            Legalább 1 nagybetű és 1 szám kötelező.
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="confirmPassword">
            Jelszó megerősítése
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {error && (
          <p style={{ color: "#fecaca", fontSize: "0.85rem" }}>{error}</p>
        )}
        <button type="submit" className="btn btn-primary" style={{ marginTop: "0.4rem" }}>
          Regisztráció
        </button>
      </form>
    </div>
  );
}

