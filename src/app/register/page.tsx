"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      router.push("/courses");
    } catch {
      setError("Network error while registering.");
    }
  }

  return (
    <div className="card">
      <h1>Create account</h1>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        Register to keep your progress in sync and unlock admin features where allowed.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ marginTop: "1.25rem", display: "grid", gap: "0.9rem" }}
      >
        <div>
          <label className="field-label" htmlFor="username">
            Username
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
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {error && (
          <p style={{ color: "#fecaca", fontSize: "0.85rem" }}>{error}</p>
        )}
        <button type="submit" className="btn btn-primary" style={{ marginTop: "0.4rem" }}>
          Sign up
        </button>
      </form>
    </div>
  );
}

