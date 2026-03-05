"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadGuestProgress } from "@/lib/storage";

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

type ProgressSummaryItem = {
  courseSlug: string;
  score: number;
  updatedAt: string;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [progressBySlug, setProgressBySlug] = useState<Record<string, number>>({});

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

        if (meData.user) {
          const progressRes = await fetch("/api/progress/summary");
          if (progressRes.ok) {
            const data = (await progressRes.json()) as {
              items: ProgressSummaryItem[];
            };
            const map: Record<string, number> = {};
            for (const item of data.items ?? []) {
              map[item.courseSlug] = item.score;
            }
            setProgressBySlug(map);
          }
        } else {
          const guest = loadGuestProgress();
          const map: Record<string, number> = {};
          for (const p of guest) {
            map[p.courseId] = p.score;
          }
          setProgressBySlug(map);
        }
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
          {courses.map((course) => {
            const savedScore =
              typeof progressBySlug[course.slug] === "number"
                ? progressBySlug[course.slug]
                : null;
            const hasProgress = savedScore !== null && savedScore >= 0;

            return (
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  alignItems: "flex-start",
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
                  {hasProgress && (
                    <span className="muted" style={{ fontSize: "0.8rem" }}>
                      Előző eredmény: {savedScore}%
                    </span>
                  )}
                </Link>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="btn btn-primary"
                    style={{ textAlign: "center" }}
                  >
                    {hasProgress ? "Folytatás" : "Kezdés"}
                  </Link>
                  {hasProgress && (
                    <Link
                      href={`/courses/${course.slug}?retry=1`}
                      className="btn btn-ghost"
                      style={{ textAlign: "center" }}
                    >
                      Újrapróbálkozás
                    </Link>
                  )}
                </div>
              </div>
            </li>
            );
          })}
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

