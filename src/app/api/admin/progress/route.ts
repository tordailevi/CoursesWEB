import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserServer } from "@/lib/auth";

export async function GET(request: Request) {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? undefined;

  const progresses = await prisma.courseProgress.findMany({
    where: username
      ? {
          user: {
            is: {
              username: {
                contains: username,
              },
            },
          },
        }
      : undefined,
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

export async function DELETE(request: Request) {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id?: number; all?: boolean } = {};
  try {
    body = (await request.json()) as { id?: number; all?: boolean };
  } catch {
    // ignore, will validate below
  }

  if (body.all) {
    const result = await prisma.courseProgress.deleteMany({});
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  if (typeof body.id !== "number") {
    return NextResponse.json(
      { error: "Az 'id' mező kötelező az egyedi törléshez." },
      { status: 400 },
    );
  }

  try {
    await prisma.courseProgress.delete({
      where: { id: body.id },
    });
  } catch {
    return NextResponse.json(
      { error: "Nem sikerült törölni az eredményt (lehet, hogy már nem létezik)." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

