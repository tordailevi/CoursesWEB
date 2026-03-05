import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionUser } from "@/lib/auth";

function passwordMeetsRules(password: string) {
  return /[A-Z]/.test(password) && /\d/.test(password);
}

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 },
      );
    }

    if (!passwordMeetsRules(password)) {
      return NextResponse.json(
        {
          error: "Password must contain at least one uppercase letter and one number.",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "user",
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    await setSessionUser(user.id);

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("Register error", err);
    return NextResponse.json(
      { error: "Unexpected error while registering." },
      { status: 500 },
    );
  }
}

