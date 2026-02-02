"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

type QuestionForm = {
  id: string;
  text: string;
  options: string[];
  answer: string;
};

export default function NewCoursePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([
    {
      id: "q-1",
      text: "",
      options: ["", "", "", ""],
      answer: "",
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as MeResponse;
        setUser(data.user);
      } catch {
        setUser(null);
      }
    }
    void load();
  }, []);

  if (!user || user.role !== "admin") {
    return (
      <div className="card">
        <h1>Admin only</h1>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          You must be logged in as an admin to create new courses.
        </p>
      </div>
    );
  }

  function updateQuestion(
    index: number,
    updater: (prev: QuestionForm) => QuestionForm,
  ) {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = updater(copy[index]);
      return copy;
    });
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${prev.length + 1}`,
        text: "",
        options: ["", "", "", ""],
        answer: "",
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a course title.");
      return;
    }

    const normalizedQuestions = questions.filter((q) => q.text.trim());
    if (!normalizedQuestions.length) {
      setError("Add at least one question.");
      return;
    }

    for (const q of normalizedQuestions) {
      if (!q.answer) {
        setError("Each question must have a correct answer selected.");
        return;
      }
    }

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || "Custom course",
          questions: normalizedQuestions.map((q) => ({
            text: q.text,
            options: q.options,
            answer: q.answer,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create course.");
        return;
      }

      router.push(`/courses/${data.slug}`);
    } catch {
      setError("Network error while saving course.");
    }
  }

  return (
    <div className="card">
      <h1>New course</h1>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        Create a course with multiple-choice questions. You can always edit the
        data later in storage.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ marginTop: "1.2rem", display: "grid", gap: "1.1rem" }}
      >
        <div>
          <label className="field-label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="description">
            Short description
          </label>
          <textarea
            id="description"
            className="input"
            style={{ minHeight: "70px", resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.35rem",
            }}
          >
            <label className="field-label">Questions</label>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ paddingInline: "0.9rem", fontSize: "0.85rem" }}
              onClick={addQuestion}
            >
              Add question
            </button>
          </div>

          <div style={{ display: "grid", gap: "0.8rem" }}>
            {questions.map((q, index) => (
              <div
                key={q.id}
                style={{
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
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-muted)",
                    }}
                  >
                    Question {index + 1}
                  </span>
                </div>
                <input
                  className="input"
                  placeholder="Question text"
                  value={q.text}
                  onChange={(e) =>
                    updateQuestion(index, (prev) => ({ ...prev, text: e.target.value }))
                  }
                  style={{ marginBottom: "0.55rem" }}
                />
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  {q.options.map((opt, optIdx) => (
                    <label
                      key={optIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={q.answer === opt}
                        onChange={() =>
                          updateQuestion(index, (prev) => ({
                            ...prev,
                            answer: prev.options[optIdx],
                          }))
                        }
                      />
                      <input
                        className="input"
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt}
                        onChange={(e) =>
                          updateQuestion(index, (prev) => {
                            const nextOptions = [...prev.options];
                            nextOptions[optIdx] = e.target.value;
                            return {
                              ...prev,
                              options: nextOptions,
                              answer:
                                prev.answer === opt ? e.target.value : prev.answer,
                            };
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: "#fecaca", fontSize: "0.85rem" }}>{error}</p>
        )}

        <button type="submit" className="btn btn-primary" style={{ marginTop: "0.4rem" }}>
          Save course
        </button>
      </form>
    </div>
  );
}


