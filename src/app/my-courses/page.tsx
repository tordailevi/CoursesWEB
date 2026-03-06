"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

type MyCourseRow = {
  id: number;
  courseSlug: string;
  courseTitle: string;
  score: number;
  attemptCount: number;
  updatedAt: string;
};

export default function MyCoursesPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [rows, setRows] = useState<MyCourseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const meRes = await fetch("/api/auth/me");
        const meData = (await meRes.json()) as MeResponse;
        setMe(meData.user);
        if (!meData.user) {
          return;
        }

        const res = await fetch("/api/progress/summary");
        const data = (await res.json()) as {
          items?: {
            courseSlug: string;
            courseTitle: string;
            score: number;
            updatedAt: string;
          }[];
          error?: string;
        };
        if (!res.ok || !Array.isArray(data.items)) {
          setError(data.error ?? "Nem sikerült betölteni a kurzus eredményeidet.");
          return;
        }

        // A summary endpoint jelenleg csak az utolsó eredményt adja kurzusonként.
        // A próbálkozások számát a /api/progress GET-ből tudjuk kinyerni kurzusonként külön.
        const enriched: MyCourseRow[] = [];
        for (const item of data.items) {
          try {
            const detailsRes = await fetch(
              `/api/progress?courseSlug=${encodeURIComponent(item.courseSlug)}`,
            );
            const detailsData = (await detailsRes.json()) as {
              attemptInfo?: { attemptCount: number | null };
              progress?: { score: number };
            };
            const attemptCount =
              typeof detailsData.attemptInfo?.attemptCount === "number"
                ? detailsData.attemptInfo.attemptCount
                : 0;

            enriched.push({
              id: enriched.length + 1,
              courseSlug: item.courseSlug,
              courseTitle: item.courseTitle,
              score: item.score,
              attemptCount,
              updatedAt: item.updatedAt,
            });
          } catch {
            // ha egy kurzusnál hiba van, a többinél még mutassunk adatot
            enriched.push({
              id: enriched.length + 1,
              courseSlug: item.courseSlug,
              courseTitle: item.courseSlug,
              score: item.score,
              attemptCount: 0,
              updatedAt: item.updatedAt,
            });
          }
        }

        setRows(enriched);
      } catch {
        setError("Nem sikerült betölteni a kurzus eredményeidet.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (!me) {
    return (
      <div className="card">
        <h1>Kurzusaim</h1>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          A saját eredményeid megtekintéséhez jelentkezz be.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Kurzusaim</h1>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        Itt látod a kurzusonkénti legutóbbi eredményedet és a próbálkozások számát.
      </p>
      {error && (
        <p style={{ color: "#fecaca", fontSize: "0.85rem", marginTop: "0.4rem" }}>
          {error}
        </p>
      )}
      <div
        style={{
          marginTop: "1rem",
          maxHeight: "60vh",
          overflowY: "auto",
          paddingRight: "0.25rem",
        }}
      >
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
              <th style={{ paddingBottom: "0.4rem" }}>Kurzus</th>
              <th style={{ paddingBottom: "0.4rem" }}>Eredmény</th>
              <th style={{ paddingBottom: "0.4rem" }}>Próbálkozások</th>
              <th style={{ paddingBottom: "0.4rem" }}>Utoljára frissítve</th>
              <th style={{ paddingBottom: "0.4rem" }}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "0.4rem 0" }}>
                  <Link
                    href={`/courses/${encodeURIComponent(r.courseSlug)}`}
                    style={{ textDecoration: "none" }}
                  >
                    {r.courseTitle}
                  </Link>
                </td>
                <td style={{ padding: "0.4rem 0" }}>{r.score}%</td>
                <td style={{ padding: "0.4rem 0" }}>{r.attemptCount}</td>
                <td
                  style={{
                    padding: "0.4rem 0",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {new Date(r.updatedAt).toLocaleString()}
                </td>
                <td style={{ padding: "0.4rem 0" }}>
                  <Link
                    href={`/courses/${encodeURIComponent(r.courseSlug)}?retry=1`}
                    className="btn btn-ghost"
                    style={{ paddingInline: "0.8rem", fontSize: "0.8rem" }}
                  >
                    Újrapróbálkozás
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="muted"
                  style={{ padding: "0.45rem 0", fontSize: "0.9rem" }}
                >
                  Még nincs elmentett eredményed egyik kurzuson sem.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

