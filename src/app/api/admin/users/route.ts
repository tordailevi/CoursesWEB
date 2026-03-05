import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserServer, hashPassword } from "@/lib/auth";

function passwordMeetsRules(password: string) {
  return /[A-Z]/.test(password) && /\d/.test(password);
}

export async function GET() {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    username?: string;
    password?: string;
    role?: "user" | "admin";
  };

  if (!body.username || !body.password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  if (!passwordMeetsRules(body.password)) {
    return NextResponse.json(
      {
        error: "Password must contain at least one uppercase letter and one number.",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username: body.username },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Username is already taken." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(body.password);

  const created = await prisma.user.create({
    data: {
      username: body.username,
      passwordHash,
      role: body.role ?? "user",
    },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      user: {
        ...created,
        createdAt: created.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: number;
    role?: string;
    password?: string;
  };

  if (!body.id) {
    return NextResponse.json(
      { error: "id is required." },
      { status: 400 },
    );
  }

  const data: { role?: "user" | "admin"; passwordHash?: string } = {};

  if (body.role) {
    if (body.role !== "user" && body.role !== "admin") {
      return NextResponse.json(
        { error: "role must be 'user' or 'admin'." },
        { status: 400 },
      );
    }
    data.role = body.role;
  }

  if (typeof body.password === "string") {
    if (!body.password.trim()) {
      return NextResponse.json(
        { error: "password cannot be empty." },
        { status: 400 },
      );
    }
    if (!passwordMeetsRules(body.password)) {
      return NextResponse.json(
        {
          error: "Password must contain at least one uppercase letter and one number.",
        },
        { status: 400 },
      );
    }
    data.passwordHash = await hashPassword(body.password);
  }

  if (!data.role && !data.passwordHash) {
    return NextResponse.json(
      { error: "Nothing to update." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: body.id },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: number;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  if (body.id === me.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  await prisma.user.delete({
    where: { id: body.id },
  });

  return NextResponse.json({ ok: true });
}

