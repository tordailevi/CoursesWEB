import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionUser, verifyPassword } from "@/lib/auth";

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

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    await setSessionUser(user.id);

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Login error", err);
    return NextResponse.json(
      { error: "Unexpected error while logging in." },
      { status: 500 },
    );
  }
}

