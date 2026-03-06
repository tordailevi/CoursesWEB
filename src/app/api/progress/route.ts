import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserServer } from "@/lib/auth";

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

export async function GET(request: Request) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseSlug = searchParams.get("courseSlug");

  if (!courseSlug) {
    return NextResponse.json(
      { error: "courseSlug is required" },
      { status: 400 },
    );
  }

  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true, maxAttemptsPerUser: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const progress = await prisma.courseProgress.findFirst({
    where: {
      userId: user.id,
      courseId: course.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!progress) {
    return NextResponse.json(
      {
        progress: null,
        attemptInfo: {
          attemptCount: 0,
          maxAttemptsPerUser: course.maxAttemptsPerUser,
        },
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    progress: {
      courseSlug,
      completedQuestionIds: JSON.parse(
        progress.completedQuestionJson,
      ) as string[],
      answers: JSON.parse(progress.answersJson) as Record<string, number[]>,
      score: progress.score,
      updatedAt: progress.updatedAt,
    },
    attemptInfo: {
      attemptCount: progress.attemptCount ?? 0,
      maxAttemptsPerUser: course.maxAttemptsPerUser,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    courseSlug?: string;
    answers?: Record<string, unknown>;
  };

  if (!body.courseSlug || typeof body.courseSlug !== "string") {
    return NextResponse.json(
      {
        error:
          "courseSlug is required.",
      },
      { status: 400 },
    );
  }

  const course = await prisma.course.findUnique({
    where: { slug: body.courseSlug },
    select: {
      id: true,
      maxAttemptsPerUser: true,
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
  const completedIds: string[] = [];

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
      completedIds.push(String(q.id));
    }
  }

  const score = course.questions.length
    ? Math.round((correct / course.questions.length) * 100)
    : 0;

  // Hány kérdésre adott egyáltalán választ (függetlenül attól, hogy helyes-e)?
  const answeredIds = new Set<string>();
  for (const q of course.questions) {
    const selected = normalizeAnswerIndexes(answerMap[String(q.id)], Infinity);
    if (selected.length > 0) {
      answeredIds.add(String(q.id));
    }
  }
  const totalQuestions = course.questions.length;
  const isFullAttempt = totalQuestions > 0 && answeredIds.size === totalQuestions;

  // Legutóbbi eredmény a felhasználó–kurzus párra
  const previous = await prisma.courseProgress.findFirst({
    where: {
      userId: user.id,
      courseId: course.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const maxAttempts = course.maxAttemptsPerUser ?? null;
  const previousAttempts =
    previous && typeof previous.attemptCount === "number" && previous.attemptCount > 0
      ? previous.attemptCount
      : 0;

  // Limit ellenőrzése: csak teljes kurzuskitöltés esetén számít a próbálkozás
  if (isFullAttempt && maxAttempts != null && previousAttempts >= maxAttempts) {
    return NextResponse.json(
      {
        error: "Elérted a maximális kitöltésszámot ennél a kurzusnál.",
        attemptInfo: {
          attemptCount: previousAttempts,
          maxAttemptsPerUser: maxAttempts,
        },
      },
      { status: 400 },
    );
  }

  const normalizedNewAnswers = JSON.stringify(body.answers ?? {});

  // Ha a válaszok megegyeznek a legutóbbi mentett eredménnyel,
  // akkor csak akkor számolunk új próbálkozást,
  // ha nem egy azonnali duplikált kérésről van szó (pl. dev módban),
  // és ha teljes kurzuskitöltésről van szó.
  if (previous && previous.answersJson === normalizedNewAnswers) {
    const now = new Date();
    const lastUpdated = previous.updatedAt instanceof Date
      ? previous.updatedAt
      : new Date(previous.updatedAt as unknown as string);
    const diffMs = now.getTime() - lastUpdated.getTime();

    // 1,5 másodpercen belüli, azonos tartalmú duplikált kérés: NEM növeljük a számlálót.
    if (diffMs < 1500) {
      return NextResponse.json(
        {
          ok: true,
          score: previous.score,
          attemptInfo: {
            attemptCount: previousAttempts,
            maxAttemptsPerUser: maxAttempts,
          },
          duplicate: true,
        },
        { status: 200 },
      );
    }

    // Ha nem teljes kitöltés, akkor csak az állapotot frissítjük, a próbálkozásszámot nem.
    if (!isFullAttempt) {
      const updated = await prisma.courseProgress.update({
        where: { id: previous.id },
        data: {
          completedQuestionJson: JSON.stringify(completedIds),
          answersJson: normalizedNewAnswers,
          score,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          score: updated.score,
          attemptInfo: {
            attemptCount: previousAttempts,
            maxAttemptsPerUser: maxAttempts,
          },
        },
        { status: 200 },
      );
    }
  }

  // Új vagy módosított eredmény mentése
  const nextAttemptCount = isFullAttempt ? previousAttempts + 1 : previousAttempts;

  if (previous) {
    const updated = await prisma.courseProgress.update({
      where: { id: previous.id },
      data: {
        completedQuestionJson: JSON.stringify(completedIds),
        answersJson: normalizedNewAnswers,
        score,
        attemptCount: nextAttemptCount,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        score: updated.score,
        attemptInfo: {
          attemptCount: updated.attemptCount ?? 0,
          maxAttemptsPerUser: maxAttempts,
        },
      },
      { status: 200 },
    );
  }

  // Még nem volt korábbi eredmény: első mentés
  const created = await prisma.courseProgress.create({
    data: {
      userId: user.id,
      courseId: course.id,
      completedQuestionJson: JSON.stringify(completedIds),
      answersJson: normalizedNewAnswers,
      score,
      attemptCount: isFullAttempt ? 1 : 0,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      score: created.score,
      attemptInfo: {
        attemptCount: created.attemptCount ?? 0,
        maxAttemptsPerUser: maxAttempts,
      },
    },
    { status: 200 },
  );
}

