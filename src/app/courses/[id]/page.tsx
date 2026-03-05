"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { loadGuestProgress, saveGuestProgress } from "@/lib/storage";

type Question = {
  id: number;
  text: string;
  imageUrl?: string | null;
  options: string[];
};

type CourseDto = {
  id: number;
  slug: string;
  title: string;
  description: string;
  questions: Question[];
};

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

type ProgressDto = {
  courseSlug: string;
  completedQuestionIds: string[];
  answers: Record<string, number[]>;
  score: number;
};

type AnswerMap = Record<number, number[]>;

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [courseRes, meRes] = await Promise.all([
          fetch(`/api/courses/${params.id}`),
          fetch("/api/auth/me"),
        ]);

        if (courseRes.status === 404) {
          setNotFoundState(true);
          return;
        }

        const courseData = (await courseRes.json()) as CourseDto;
        const meData = (await meRes.json()) as MeResponse;
        setCourse(courseData);
        setUser(meData.user);
        setCurrentIndex(0);
        setAnswers({});
        setScore(null);

        const retry = searchParams.get("retry") === "1";
        if (retry) {
          return;
        }

        const loggedIn = !!meData.user;
        if (loggedIn) {
          const progressRes = await fetch(
            `/api/progress?courseSlug=${encodeURIComponent(courseData.slug)}`,
          );
          if (progressRes.ok) {
            const { progress } = (await progressRes.json()) as {
              progress: ProgressDto | null;
            };
            if (progress) {
              const previousAnswers: AnswerMap = {};
              for (const [idStr, selected] of Object.entries(progress.answers ?? {})) {
                const id = Number(idStr);
                if (Number.isFinite(id)) {
                  previousAnswers[id] = Array.isArray(selected)
                    ? selected.filter((n) => Number.isInteger(n))
                    : [];
                }
              }
              setAnswers(previousAnswers);
              setScore(progress.score);
            }
          }
        } else {
          const guest = loadGuestProgress().find(
            (p) => p.courseId === courseData.slug,
          );
          if (guest) {
            const previousAnswers: AnswerMap = {};
            for (const [idStr, selected] of Object.entries(guest.answers ?? {})) {
              const id = Number(idStr);
              if (Number.isFinite(id)) {
                previousAnswers[id] = Array.isArray(selected)
                  ? selected.filter((n) => Number.isInteger(n))
                  : [];
              }
            }
            setAnswers(previousAnswers);
            setScore(guest.score >= 0 ? guest.score : null);
          }
        }
      } catch {
        // ignore, UI will show empty state
      }
    }
    void load();
  }, [params.id, searchParams]);

  const totalQuestions = useMemo(
    () => course?.questions.length ?? 0,
    [course?.questions.length],
  );

  if (notFoundState) {
    notFound();
  }

  if (!course) {
    return (
      <div className="card-grid">
        <section className="card">
          <p className="muted">Kurzus betöltése...</p>
        </section>
      </div>
    );
  }

  function toggleOption(questionId: number, optionIndex: number) {
    setAnswers((prev) => {
      const existing = prev[questionId] ?? [];
      const next = existing.includes(optionIndex)
        ? existing.filter((i) => i !== optionIndex)
        : [...existing, optionIndex];
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;
    setError(null);
    const loggedIn = !!user;

    if (loggedIn) {
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseSlug: course.slug,
            answers: Object.fromEntries(
              Object.entries(answers).map(([k, v]) => [String(k), v]),
            ),
          }),
        });
        const data = (await res.json()) as { ok?: boolean; score?: number; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Nem sikerült elmenteni a válaszokat.");
          return;
        }
        if (typeof data.score === "number") {
          setScore(data.score);
        }
      } catch {
        setError("Hálózati hiba mentés közben.");
      }
    } else {
      try {
        const res = await fetch("/api/progress/compute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseSlug: course.slug,
            answers: Object.fromEntries(
              Object.entries(answers).map(([k, v]) => [String(k), v]),
            ),
          }),
        });
        const data = (await res.json()) as {
          score?: number;
          completedQuestionIds?: string[];
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Nem sikerült kiszámolni az eredményt.");
          return;
        }

        const all = loadGuestProgress();
        const existingIndex = all.findIndex((p) => p.courseId === course.slug);
        const created = {
          courseId: course.slug,
          completedQuestionIds: Array.isArray(data.completedQuestionIds)
            ? data.completedQuestionIds
            : [],
          answers: Object.fromEntries(
            Object.entries(answers).map(([k, v]) => [String(k), v]),
          ),
          score: typeof data.score === "number" ? data.score : 0,
        };
        if (existingIndex === -1) {
          saveGuestProgress([...all, created]);
        } else {
          const copy = [...all];
          copy[existingIndex] = created;
          saveGuestProgress(copy);
        }

        setScore(created.score);
      } catch {
        setError("Hálózati hiba mentés közben.");
      }
    }
  }

  const percentLabel =
    score !== null ? `${score}%` : "Nincs elmentve";

  const currentQuestion = course.questions[currentIndex];
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <div className="card-grid">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1>{course.title}</h1>
            <p className="muted" style={{ marginTop: "0.2rem" }}>
              {course.description}
            </p>
          </div>
          <Link href="/courses" className="btn btn-ghost">
            Főoldal
          </Link>
        </div>
        <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.8rem" }}>
          {user
            ? `Bejelentkezve mint ${user.username}. A haladás a fiókodhoz mentődik.`
            : "Vendég módban vagy. A haladás csak ebben a böngészőben mentődik."}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ marginTop: "1.3rem", display: "grid", gap: "1rem" }}
        >
          <div
            key={currentQuestion.id}
            className="question-panel"
            style={{
              padding: "0.9rem 0.95rem",
              borderRadius: "12px",
              border: "1px solid rgba(148, 163, 184, 0.45)",
              backgroundColor: "rgba(15, 23, 42, 0.9)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.4rem",
                gap: "0.75rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Kérdés {currentIndex + 1} / {totalQuestions}
                </div>
                <p style={{ marginTop: "0.1rem" }}>{currentQuestion.text}</p>
                {currentQuestion.imageUrl && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "1px solid rgba(148, 163, 184, 0.35)",
                      maxHeight: "260px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                    }}
                  >
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Kérdés illusztráció"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "260px",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.45rem" }}>
              {currentQuestion.options.map((opt, optIdx) => {
                const selected = answers[currentQuestion.id] ?? [];
                const isSelected = selected.includes(optIdx);

                return (
                  <label
                    key={`${currentQuestion.id}-${optIdx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "999px",
                      border: "1px solid rgba(148, 163, 184, 0.4)",
                      cursor: "pointer",
                      backgroundColor: isSelected
                        ? "rgba(56, 189, 248, 0.12)"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(currentQuestion.id, optIdx)}
                    />
                    <span style={{ fontSize: "0.9rem" }}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginTop: "0.5rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                Előző
              </button>
              {!isLast ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))
                  }
                >
                  Következő
                </button>
              ) : (
                <button type="submit" className="btn btn-primary">
                  Válaszok mentése
                </button>
              )}
            </div>
            <div style={{ display: "grid", justifyItems: "end", gap: "0.25rem" }}>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Mentett eredmény: {percentLabel}
              </p>
              {error && (
                <p style={{ color: "#fecaca", fontSize: "0.85rem" }}>{error}</p>
              )}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}


