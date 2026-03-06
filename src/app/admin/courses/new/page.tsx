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
  imageUrl?: string;
  options: string[];
  correctOptionIndexes: number[];
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
      imageUrl: "",
      options: ["", "", "", ""],
      correctOptionIndexes: [],
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attemptLimitInput, setAttemptLimitInput] = useState<string>("");

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
        <h1>Csak adminoknak</h1>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          Új kurzus létrehozásához admin fiókkal kell belépned.
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
        imageUrl: "",
        options: ["", "", "", ""],
        correctOptionIndexes: [],
      },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleImageDrop(questionId: string, file: File) {
    setUploadError(null);
    setUploadingForId(questionId);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Failed to upload image.");
        return;
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, imageUrl: data.url as string } : q,
        ),
      );
    } catch {
      setUploadError("Network error while uploading image.");
    } finally {
      setUploadingForId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Kérlek add meg a kurzus címét.");
      return;
    }

    const normalizedQuestions = questions.filter((q) => q.text.trim());
    if (!normalizedQuestions.length) {
      setError("Adj hozzá legalább egy kérdést.");
      return;
    }

    const preparedQuestions: {
      text: string;
      imageUrl: string | null;
      options: string[];
      correctOptionIndexes: number[];
    }[] = [];

    for (const q of normalizedQuestions) {
      const optionPairs = q.options
        .map((value, idx) => ({ value: value.trim(), idx }))
        .filter((p) => p.value);

      if (optionPairs.length < 2) {
        setError("Minden kérdéshez legalább 2 válaszlehetőség kell.");
        return;
      }

      const indexMap = new Map<number, number>();
      optionPairs.forEach((p, newIdx) => indexMap.set(p.idx, newIdx));

      const correct = Array.from(
        new Set(
          q.correctOptionIndexes
            .map((oldIdx) => indexMap.get(oldIdx))
            .filter((v): v is number => v != null),
        ),
      ).sort((a, b) => a - b);

      if (!correct.length) {
        setError("Minden kérdésnél jelölj be legalább egy helyes választ.");
        return;
      }

      preparedQuestions.push({
        text: q.text.trim(),
        imageUrl: q.imageUrl?.trim() ? q.imageUrl.trim() : null,
        options: optionPairs.map((p) => p.value),
        correctOptionIndexes: correct,
      });
    }

    let maxAttemptsPerUser: number | null = null;
    const trimmedLimit = attemptLimitInput.trim();
    if (trimmedLimit.length > 0) {
      const parsed = Number(trimmedLimit);
      if (!Number.isNaN(parsed) && Number.isInteger(parsed) && parsed > 0) {
        maxAttemptsPerUser = parsed;
      } else {
        setError("A kitöltési limitnek pozitív egész számnak kell lennie, vagy hagyd üresen a végtelenhez.");
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
          questions: preparedQuestions,
          maxAttemptsPerUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nem sikerült létrehozni a kurzust.");
        return;
      }

      router.push(`/courses/${data.slug}`);
    } catch {
      setError("Hálózati hiba mentés közben.");
    }
  }

  return (
    <div className="card">
      <h1>Új kurzus</h1>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        Hozz létre egy kurzust feleletválasztós kérdésekkel. Később bármikor
        szerkeszthető.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ marginTop: "1.2rem", display: "grid", gap: "1.1rem" }}
      >
        <div>
          <label className="field-label" htmlFor="title">
            Cím
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
            Rövid leírás
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
          <label className="field-label" htmlFor="attemptLimit">
            Maximális kitöltések száma / felhasználó
          </label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              id="attemptLimit"
              className="input"
              style={{ maxWidth: "160px" }}
              placeholder="pl. 3 vagy üres = végtelen"
              value={attemptLimitInput}
              onChange={(e) => setAttemptLimitInput(e.target.value)}
            />
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ paddingInline: "0.6rem", fontSize: "0.8rem" }}
                onClick={() => setAttemptLimitInput("1")}
              >
                1
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ paddingInline: "0.6rem", fontSize: "0.8rem" }}
                onClick={() => setAttemptLimitInput("5")}
              >
                5
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ paddingInline: "0.6rem", fontSize: "0.8rem" }}
                onClick={() => setAttemptLimitInput("")}
              >
                Végtelen
              </button>
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
            Ha üresen hagyod, a kurzus korlátlanul tölthető ki.
          </p>
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
            <label className="field-label">Kérdések</label>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ paddingInline: "0.9rem", fontSize: "0.85rem" }}
              onClick={addQuestion}
            >
              Kérdés hozzáadása
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
                    gap: "0.6rem",
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
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ paddingInline: "0.7rem", fontSize: "0.8rem" }}
                    disabled={questions.length <= 1}
                    onClick={() => removeQuestion(index)}
                  >
                    Kérdés törlése
                  </button>
                </div>
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  <input
                    className="input"
                    placeholder="Kérdés szövege"
                    value={q.text}
                    onChange={(e) =>
                      updateQuestion(index, (prev) => ({
                        ...prev,
                        text: e.target.value,
                      }))
                    }
                  />

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const file = event.dataTransfer.files?.[0];
                      if (file) {
                        void handleImageDrop(q.id, file);
                      }
                    }}
                    style={{
                      marginTop: "0.25rem",
                      padding: "0.75rem",
                      borderRadius: "10px",
                      border: "1px dashed rgba(148, 163, 184, 0.7)",
                      background:
                        "radial-gradient(circle at top left, rgba(56, 189, 248, 0.1), transparent 55%), rgba(15, 23, 42, 0.9)",
                      cursor: "pointer",
                      display: "grid",
                      gap: "0.4rem",
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (file) {
                          void handleImageDrop(q.id, file);
                        }
                      };
                      input.click();
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Húzd ide a képet (drag &amp; drop), vagy kattints a kiválasztáshoz.
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      JPG, PNG, GIF, max 5MB. A képet automatikusan szépen
                      méretezzük, hogy ne foglalja el a fél oldalt.
                    </span>
                    {uploadingForId === q.id && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Kép feltöltése...
                      </span>
                    )}
                  </div>

                  <input
                    className="input"
                    placeholder="Kép URL (opcionális)"
                    value={q.imageUrl ?? ""}
                    onChange={(e) =>
                      updateQuestion(index, (prev) => ({
                        ...prev,
                        imageUrl: e.target.value,
                      }))
                    }
                  />

                  {q.imageUrl && (
                    <div
                      style={{
                        marginTop: "0.35rem",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1px solid rgba(148, 163, 184, 0.4)",
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        maxHeight: "220px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={q.imageUrl}
                        alt="Kép előnézet"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "220px",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </div>
                  )}
                </div>
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
                        type="checkbox"
                        checked={q.correctOptionIndexes.includes(optIdx)}
                        onChange={() =>
                          updateQuestion(index, (prev) => ({
                            ...prev,
                            correctOptionIndexes: prev.correctOptionIndexes.includes(
                              optIdx,
                            )
                              ? prev.correctOptionIndexes.filter((i) => i !== optIdx)
                              : [...prev.correctOptionIndexes, optIdx].sort(
                                  (a, b) => a - b,
                                ),
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
                            };
                          })
                        }
                      />
                    </label>
                  ))}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ paddingInline: "0.8rem", fontSize: "0.8rem" }}
                      onClick={() =>
                        updateQuestion(index, (prev) => ({
                          ...prev,
                          options: [...prev.options, ""],
                        }))
                      }
                    >
                      Válasz hozzáadása
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ paddingInline: "0.8rem", fontSize: "0.8rem" }}
                      disabled={q.options.length <= 2}
                      onClick={() =>
                        updateQuestion(index, (prev) => {
                          const removeIndex = prev.options.length - 1;
                          const nextOptions = prev.options.slice(0, -1);
                          const nextCorrect = prev.correctOptionIndexes
                            .filter((i) => i !== removeIndex)
                            .filter((i) => i < nextOptions.length);
                          return {
                            ...prev,
                            options: nextOptions,
                            correctOptionIndexes: nextCorrect,
                          };
                        })
                      }
                    >
                      Válasz törlése
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: "#fecaca", fontSize: "0.85rem" }}>{error}</p>
        )}
        {uploadError && (
          <p style={{ color: "#fecaca", fontSize: "0.8rem" }}>{uploadError}</p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ marginTop: "0.4rem" }}
        >
          Kurzus mentése
        </button>
      </form>
    </div>
  );
}

