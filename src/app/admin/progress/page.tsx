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

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = (await meRes.json()) as MeResponse;
        setMe(meData.user);
        if (!meData.user || meData.user.role !== "admin") {
          return;
        }
        const res = await fetch("/api/admin/progress");
        const data = (await res.json()) as { items: ProgressRow[] };
        setRows(data.items);
      } catch {
        setError("Nem sikerült betölteni az eredményeket.");
      }
    }
    void load();
  }, []);

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
        Minden sor egy felhasználó legutóbbi eredményét mutatja (százalékban).
      </p>
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

