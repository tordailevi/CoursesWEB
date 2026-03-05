import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserServer } from "@/lib/auth";

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
    select: { id: true },
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
    return NextResponse.json({ progress: null }, { status: 200 });
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
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    courseSlug?: string;
    completedQuestionIds?: string[];
    answers?: Record<string, number[]>;
    score?: number;
  };

  if (!body.courseSlug || !body.completedQuestionIds || body.score == null) {
    return NextResponse.json(
      {
        error:
          "courseSlug, completedQuestionIds and score are required fields.",
      },
      { status: 400 },
    );
  }

  const course = await prisma.course.findUnique({
    where: { slug: body.courseSlug },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const data = {
    userId: user.id,
    courseId: course.id,
    completedQuestionJson: JSON.stringify(body.completedQuestionIds),
    answersJson: JSON.stringify(body.answers ?? {}),
    score: body.score,
  };

  await prisma.courseProgress.create({ data });

  return NextResponse.json({ ok: true }, { status: 200 });
}

