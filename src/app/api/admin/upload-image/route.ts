import { NextResponse } from "next/server";
import { getCurrentUserServer } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: Request) {
  const me = await getCurrentUserServer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Invalid content type, expected multipart/form-data." },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "No file uploaded." },
      { status: 400 },
    );
  }

  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeBytes) {
    return NextResponse.json(
      { error: "Image is too large (max 5MB)." },
      { status: 400 },
    );
  }

  const mimeType = file.type;
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed." },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeName =
    (file.name || "image").replace(/[^a-zA-Z0-9.\-_]/g, "_") || "image";
  const uniqueName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;

  const filePath = path.join(uploadsDir, uniqueName);
  await fs.writeFile(filePath, buffer);

  const publicUrl = `/uploads/${uniqueName}`;

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}

