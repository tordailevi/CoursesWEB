import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeAnswerIndexes(value: unknown, maxExclusive: number): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < maxExclusive),
    ),
  ).sort((a, b) => a - b);
}

function parseCorrectOptionIndexes(
  correctOptionIndexesJson: string,
  legacyAnswer: string,
  options: string[],
): number[] {
  try {
    const parsed = JSON.parse(correctOptionIndexesJson) as unknown;
    if (Array.isArray(parsed)) {
      const nums = parsed
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
      if (nums.length) {
        return Array.from(new Set(nums)).sort((a, b) => a - b);
      }
    }
  } catch {
    // ignore and fall back
  }

  const legacyIdx = options.indexOf(legacyAnswer);
  return options.length ? [legacyIdx >= 0 ? legacyIdx : 0] : [];
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    courseSlug?: string;
    answers?: Record<string, unknown>;
  };

  if (!body.courseSlug || typeof body.courseSlug !== "string") {
    return NextResponse.json({ error: "courseSlug is required" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { slug: body.courseSlug },
    select: {
      id: true,
      questions: {
        select: {
          id: true,
          optionsJson: true,
          answer: true,
          correctOptionIndexesJson: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const answerMap = body.answers ?? {};

  let correct = 0;
  const completedQuestionIds: string[] = [];

  for (const q of course.questions) {
    let options: string[] = [];
    try {
      const parsed = JSON.parse(q.optionsJson) as unknown;
      if (Array.isArray(parsed)) {
        options = parsed.map((v) => String(v));
      }
    } catch {
      options = [];
    }

    const expected = parseCorrectOptionIndexes(
      q.correctOptionIndexesJson,
      q.answer,
      options,
    );
    const selected = normalizeAnswerIndexes(answerMap[String(q.id)], options.length);

    const same =
      selected.length === expected.length && selected.every((v, i) => v === expected[i]);

    if (same) {
      correct += 1;
      completedQuestionIds.push(String(q.id));
    }
  }

  const score = course.questions.length
    ? Math.round((correct / course.questions.length) * 100)
    : 0;

  return NextResponse.json({ score, completedQuestionIds }, { status: 200 });
}

