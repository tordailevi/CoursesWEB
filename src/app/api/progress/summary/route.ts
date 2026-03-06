import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserServer } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUserServer();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progresses = await prisma.courseProgress.findMany({
    where: { userId: user.id },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    include: {
      course: { select: { slug: true, title: true } },
    },
  });

  const seen = new Set<string>();
  const items: {
    courseSlug: string;
    courseTitle: string;
    score: number;
    updatedAt: string;
  }[] = [];

  for (const p of progresses) {
    const slug = p.course.slug;
    if (seen.has(slug)) continue;
    seen.add(slug);
    items.push({
      courseSlug: slug,
      courseTitle: p.course.title,
      score: p.score,
      updatedAt: p.updatedAt.toISOString(),
    });
  }

  return NextResponse.json({ items }, { status: 200 });
}

