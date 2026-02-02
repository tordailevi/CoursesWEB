"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { loadGuestProgress, saveGuestProgress } from "@/lib/storage";

type Question = {
  id: number;
  text: string;
  options: string[];
  answer: string;
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
  score: number;
};

type AnswerMap = Record<number, string>;

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    async function load() {
      try {
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
              progress.completedQuestionIds.forEach((idStr) => {
                const id = Number(idStr);
                const q = courseData.questions.find((qq) => qq.id === id);
                if (q) {
                  previousAnswers[q.id] = q.answer;
                }
              });
              setAnswers(previousAnswers);
              setScore(progress.score);
              setSubmitted(true);
            }
          }
        } else {
          const guest = loadGuestProgress().find(
            (p) => p.courseId === courseData.slug,
          );
          if (guest) {
            const previousAnswers: AnswerMap = {};
            guest.completedQuestionIds.forEach((id) => {
              const idNum = Number(id);
              const q = courseData.questions.find((qq) => qq.id === idNum);
              if (q) {
                previousAnswers[q.id] = q.answer;
              }
            });
            setAnswers(previousAnswers);
            setScore(guest.score >= 0 ? guest.score : null);
            setSubmitted(guest.score >= 0);
          }
        }
      } catch {
        // ignore, UI will show empty state
      }
    }
    void load();
  }, [params.id]);

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
          <p className="muted">Loading course...</p>
        </section>
      </div>
    );
  }

  function handleChange(questionId: number, option: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;

    let correct = 0;
    const completedIds: string[] = [];

    course.questions.forEach((q) => {
      if (answers[q.id] === q.answer) {
        correct += 1;
        completedIds.push(String(q.id));
      }
    });

    const percent = course.questions.length
      ? Math.round((correct / course.questions.length) * 100)
      : 0;

    setSubmitted(true);
    setScore(percent);

    const loggedIn = !!user;

    if (loggedIn) {
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseSlug: course.slug,
            completedQuestionIds: completedIds,
            score: percent,
          }),
        });
      } catch {
        // ignore
      }
    } else {
      const all = loadGuestProgress();
      const existingIndex = all.findIndex((p) => p.courseId === course.slug);
      const created = {
        courseId: course.slug,
        completedQuestionIds: completedIds,
        score: percent,
      };
      if (existingIndex === -1) {
        saveGuestProgress([...all, created]);
      } else {
        const copy = [...all];
        copy[existingIndex] = created;
        saveGuestProgress(copy);
      }
    }
  }

  const percentLabel =
    submitted && score !== null ? `${score}% correct` : "Not submitted yet";

  return (
    <div className="card-grid">
      <section className="card">
        <h1>{course.title}</h1>
        <p className="muted" style={{ marginTop: "0.2rem" }}>
          {course.description}
        </p>
        <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.8rem" }}>
          {user
            ? `Logged in as ${user.username}. Your progress is saved to your account.`
            : "You are working as a guest. Progress is saved in this browser only."}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ marginTop: "1.3rem", display: "grid", gap: "1rem" }}
        >
          {course.questions.map((q, idx) => (
            <div
              key={q.id}
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
                    Question {idx + 1} / {totalQuestions}
                  </div>
                  <p style={{ marginTop: "0.1rem" }}>{q.text}</p>
                </div>
              </div>
              <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.45rem" }}>
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt;
                  const isCorrect = submitted && opt === q.answer;
                  const isWrongSelected = submitted && isSelected && !isCorrect;

                  return (
                    <label
                      key={opt}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(148, 163, 184, 0.4)",
                        cursor: "pointer",
                        backgroundColor: isCorrect
                          ? "rgba(34, 197, 94, 0.15)"
                          : isWrongSelected
                            ? "rgba(239, 68, 68, 0.18)"
                            : isSelected
                              ? "rgba(56, 189, 248, 0.12)"
                              : "transparent",
                      }}
                    >
                      <input
                        type="radio"
                        name={String(q.id)}
                        value={opt}
                        checked={isSelected}
                        onChange={() => handleChange(q.id, opt)}
                      />
                      <span style={{ fontSize: "0.9rem" }}>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginTop: "0.5rem",
            }}
          >
            <button type="submit" className="btn btn-primary">
              Check answers
            </button>
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Score: {percentLabel}
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}


