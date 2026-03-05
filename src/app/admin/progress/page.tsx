"use client";

import { useEffect, useState } from "react";

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

type ProgressRow = {
  id: number;
  username: string;
  courseTitle: string;
  score: number;
  updatedAt: string;
};

export default function AdminProgressPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = (await meRes.json()) as MeResponse;
        setMe(meData.user);
        if (!meData.user || meData.user.role !== "admin") {
          return;
        }
      } catch {
        setError("Nem sikerült betölteni az eredményeket.");
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!me || me.role !== "admin") return;

    const handle = window.setTimeout(async () => {
      try {
        setError(null);
        setLoading(true);
        const url =
          query.trim().length > 0
            ? `/api/admin/progress?username=${encodeURIComponent(query.trim())}`
            : "/api/admin/progress";
        const res = await fetch(url);
        const data = (await res.json()) as { items: ProgressRow[]; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Nem sikerült betölteni az eredményeket.");
          return;
        }
        setRows(data.items);
      } catch {
        setError("Nem sikerült betölteni az eredményeket.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [me, query]);

  if (!me) {
    return (
      <div className="card">
        <h1>Admin – Eredmények</h1>
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
          Az összes kurzus eredményeit csak admin láthatja.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Felhasználói eredmények</h1>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        Minden sor egy kurzuskitöltés eredményét mutatja (százalékban).
      </p>
      <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.6rem" }}>
        <input
          className="input"
          placeholder="Keresés felhasználónévre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setQuery("")}
          disabled={loading || !query.trim()}
        >
          Törlés
        </button>
      </div>
      {error && (
        <p style={{ color: "#fecaca", fontSize: "0.85rem", marginTop: "0.4rem" }}>
          {error}
        </p>
      )}
      <div style={{ marginTop: "1rem" }}>
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
              <th style={{ paddingBottom: "0.4rem" }}>Felhasználó</th>
              <th style={{ paddingBottom: "0.4rem" }}>Kurzus</th>
              <th style={{ paddingBottom: "0.4rem" }}>Eredmény</th>
              <th style={{ paddingBottom: "0.4rem" }}>Frissítve</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "0.4rem 0" }}>{r.username}</td>
                <td style={{ padding: "0.4rem 0" }}>{r.courseTitle}</td>
                <td style={{ padding: "0.4rem 0" }}>{r.score}%</td>
                <td style={{ padding: "0.4rem 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {new Date(r.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

