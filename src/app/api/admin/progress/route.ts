import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserServer } from "@/lib/auth";

export async function GET() {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const progresses = await prisma.courseProgress.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: true,
      course: true,
    },
  });

  const items = progresses.map((p) => ({
    id: p.id,
    username: p.user.username,
    courseTitle: p.course.title,
    score: p.score,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items });
}

