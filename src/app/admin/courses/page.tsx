"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

type CourseListItem = {
  id: number;
  slug: string;
  title: string;
  description: string;
  questionCount: number;
};

export default function AdminCoursesPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, coursesRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/courses"),
        ]);
        const meData = (await meRes.json()) as MeResponse;
        setMe(meData.user);
        if (!meData.user || meData.user.role !== "admin") return;
        const coursesData = (await coursesRes.json()) as CourseListItem[];
        setCourses(coursesData);
      } catch {
        setError("Nem sikerült betölteni a kurzusokat.");
      }
    }
    void load();
  }, []);

  async function deleteCourse(slug: string) {
    if (!window.confirm("Biztosan törlöd ezt a kurzust?")) return;
    try {
      setError(null);
      const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nem sikerült törölni a kurzust.");
        return;
      }
      setCourses((prev) => prev.filter((c) => c.slug !== slug));
    } catch {
      setError("Hálózati hiba kurzus törlése közben.");
    }
  }

  if (!me) {
    return (
      <div className="card">
        <h1>Admin – Kurzusok</h1>
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
          Kurzusokat csak admin jogosultsággal lehet kezelni.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h1>Kurzusok</h1>
          <p className="muted" style={{ marginTop: "0.25rem" }}>
            Kurzusok szerkesztése és törlése. Törléskor a kérdések és a kapcsolódó
            eredmények is törlődnek.
          </p>
        </div>
        <Link href="/admin/courses/new" className="btn btn-primary">
          Új kurzus
        </Link>
      </div>

      {error && (
        <p style={{ color: "#fecaca", fontSize: "0.85rem", marginTop: "0.6rem" }}>
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
              <th style={{ paddingBottom: "0.4rem" }}>Cím</th>
              <th style={{ paddingBottom: "0.4rem" }}>Kérdések</th>
              <th style={{ paddingBottom: "0.4rem" }}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: "0.45rem 0" }}>
                  <div style={{ display: "grid", gap: "0.15rem" }}>
                    <strong style={{ fontWeight: 600 }}>{c.title}</strong>
                    <span className="muted" style={{ fontSize: "0.8rem" }}>
                      {c.slug}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "0.45rem 0" }}>{c.questionCount}</td>
                <td style={{ padding: "0.45rem 0" }}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <Link
                      href={`/admin/courses/${encodeURIComponent(c.slug)}`}
                      className="btn btn-primary"
                      style={{ paddingInline: "0.7rem", fontSize: "0.8rem" }}
                    >
                      Szerkesztés
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ paddingInline: "0.7rem", fontSize: "0.8rem" }}
                      onClick={() => deleteCourse(c.slug)}
                    >
                      Törlés
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td className="muted" style={{ padding: "0.45rem 0" }}>
                  Még nincs kurzus.
                </td>
                <td />
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

