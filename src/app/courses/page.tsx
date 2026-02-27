"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CourseListItem = {
  id: number;
  slug: string;
  title: string;
  description: string;
  questionCount: number;
};

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [user, setUser] = useState<MeResponse["user"] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [coursesRes, meRes] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/auth/me"),
        ]);
        const coursesData = (await coursesRes.json()) as CourseListItem[];
        const meData = (await meRes.json()) as MeResponse;
        setCourses(coursesData);
        setUser(meData.user);
      } catch {
        // ignore for now, UI will just show empty state
      }
    }
    void load();
  }, []);

  return (
    <div className="card-grid">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1>Kurzusok</h1>
            <p className="muted" style={{ marginTop: "0.3rem" }}>
              Válassz egy kurzust és kezdd el megválaszolni a kérdéseket. Később
              visszatérhetsz és folytathatod.
            </p>
          </div>
          {user?.role === "admin" && (
            <Link href="/admin/courses/new" className="btn btn-primary">
              Új kurzus
            </Link>
          )}
        </div>

        <ul style={{ marginTop: "1.4rem", display: "grid", gap: "0.7rem" }}>
          {courses.map((course) => (
            <li
              key={course.id}
              style={{
                listStyle: "none",
                padding: "0.85rem 0.9rem",
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.45)",
                backgroundColor: "rgba(15, 23, 42, 0.9)",
              }}
            >
              <Link
                href={`/courses/${course.slug}`}
                style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
              >
                <span style={{ fontWeight: 550 }}>{course.title}</span>
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {course.description}
                </span>
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {course.questionCount} kérdés
                </span>
              </Link>
            </li>
          ))}
          {courses.length === 0 && (
            <li className="muted" style={{ listStyle: "none" }}>
              Még nincs kurzus.{" "}
              {user?.role === "admin"
                ? "Hozd létre az elsőt az admin felületen."
                : "Kérj meg egy admint, hogy hozzon létre kurzust."}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

