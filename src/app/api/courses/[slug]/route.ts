import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserServer } from "@/lib/auth";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_req: Request, context: Params) {
  const { slug } = await context.params;
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      questions: {
        select: {
          id: true,
          text: true,
          imageUrl: true,
          optionsJson: true,
          answer: true,
          correctOptionIndexesJson: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mapped = {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    questions: course.questions.map((q) => {
      let options: string[] = [];
      try {
        const parsed = JSON.parse(q.optionsJson) as unknown;
        if (Array.isArray(parsed)) {
          options = parsed.map((v) => String(v));
        }
      } catch {
        options = [];
      }

      let correctOptionIndexes: number[] = [];
      try {
        const parsed = JSON.parse(q.correctOptionIndexesJson) as unknown;
        if (Array.isArray(parsed)) {
          const nums = parsed
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
          if (nums.length) {
            correctOptionIndexes = Array.from(new Set(nums)).sort((a, b) => a - b);
          }
        }
      } catch {
        // ignore and fall back
      }

      if (!correctOptionIndexes.length && options.length) {
        const legacyIdx = options.indexOf(q.answer);
        correctOptionIndexes = [legacyIdx >= 0 ? legacyIdx : 0];
      }

      return {
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl,
        options,
        correctOptionIndexes,
      };
    }),
  };

  return NextResponse.json(mapped);
}

export async function PATCH(request: Request, context: Params) {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await context.params;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    questions?: {
      id?: number;
      text: string;
      imageUrl?: string | null;
      options: string[];
      correctOptionIndexes?: number[];
      answer?: string;
    }[];
  };

  const incomingQuestions = body.questions;

  if (!body.title || !incomingQuestions || incomingQuestions.length === 0) {
    return NextResponse.json(
      { error: "title and at least one question are required." },
      { status: 400 },
    );
  }

  const exists = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      questions: {
        select: { id: true },
      },
    },
  });

  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const courseId = exists.id;
  const incomingExistingIds = new Set(
    incomingQuestions
      .map((q) => q.id)
      .filter((id): id is number => Number.isInteger(id)),
  );
  const existingIds = exists.questions.map((q) => q.id);
  const existingIdSet = new Set(existingIds);
  const idsToDelete = existingIds.filter((id) => !incomingExistingIds.has(id));

  const updated = await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: courseId },
      data: {
        title: body.title,
        description: body.description ?? "",
      },
      select: { id: true },
    });

    if (idsToDelete.length) {
      await tx.question.deleteMany({
        where: { courseId, id: { in: idsToDelete } },
      });
    }

    for (const q of incomingQuestions) {
      const correctIndexes = Array.from(
        new Set(
          (Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes) ||
            (q.answer ? [q.options.indexOf(q.answer)] : [0]),
        ),
      )
        .filter((i) => Number.isInteger(i) && i >= 0 && i < q.options.length)
        .sort((a, b) => a - b);

      const payload = {
        text: q.text,
        imageUrl: q.imageUrl ?? null,
        optionsJson: JSON.stringify(q.options),
        answer:
          q.answer ??
          q.options[correctIndexes[0] ?? 0] ??
          q.options[0] ??
          "",
        correctOptionIndexesJson: JSON.stringify(correctIndexes),
      };

      if (q.id && Number.isInteger(q.id) && existingIdSet.has(q.id)) {
        await tx.question.update({
          where: { id: q.id },
          data: payload,
        });
      } else {
        await tx.question.create({
          data: {
            courseId,
            ...payload,
          },
        });
      }
    }

    return tx.course.findUnique({
      where: { id: courseId },
      select: { slug: true },
    });
  });

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(_request: Request, context: Params) {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await context.params;
  const existing = await prisma.course.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.course.delete({ where: { slug } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

