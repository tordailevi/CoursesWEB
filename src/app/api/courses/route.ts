import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserServer } from "@/lib/auth";

const seedCourses = [
  {
    slug: "html-basics",
    title: "HTML Basics",
    description: "Learn the building blocks of web pages.",
    questions: [
      {
        text: "What does HTML stand for?",
        options: [
          "Hyper Text Markup Language",
          "Home Tool Markup Language",
          "Hyperlinks and Text Markup Language",
          "High Text Markup Language",
        ],
        answer: "Hyper Text Markup Language",
      },
      {
        text: "Which tag is used for the largest heading?",
        options: ["<heading>", "<h6>", "<h1>", "<head>"],
        answer: "<h1>",
      },
    ],
  },
  {
    slug: "javascript-basics",
    title: "JavaScript Basics",
    description: "Start programming in JavaScript.",
    questions: [
      {
        text: "Which keyword is recommended to declare variables in modern JavaScript?",
        options: ["var", "let", "const", "Both let and const"],
        answer: "Both let and const",
      },
      {
        text: "How do you write a single-line comment in JavaScript?",
        options: [
          "// This is a comment",
          "<!-- This is a comment -->",
          "# This is a comment",
          "/* This is a comment */",
        ],
        answer: "// This is a comment",
      },
    ],
  },
];

export async function GET() {
  // Seed demo courses on first request
  const count = await prisma.course.count();
  if (count === 0) {
    for (const course of seedCourses) {
      await prisma.course.create({
        data: {
          slug: course.slug,
          title: course.title,
          description: course.description,
          questions: {
            create: course.questions.map((q) => ({
              text: q.text,
              imageUrl: null,
              optionsJson: JSON.stringify(q.options),
              answer: q.answer,
              correctOptionIndexesJson: JSON.stringify([
                Math.max(0, q.options.indexOf(q.answer)),
              ]),
            })),
          },
        },
      });
    }
  }

  const courses = await prisma.course.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      questions: {
        select: { id: true },
      },
    },
  });

  return NextResponse.json(
    courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      questionCount: c.questions.length,
    })),
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUserServer();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, description, questions } = (await request.json()) as {
    title?: string;
    description?: string;
    questions?: {
      text: string;
      imageUrl?: string | null;
      options: string[];
      answer?: string;
      correctOptionIndexes?: number[];
    }[];
  };

  if (!title || !questions || questions.length === 0) {
    return NextResponse.json(
      { error: "Title and at least one question are required." },
      { status: 400 },
    );
  }

  const baseSlug = title.toLowerCase().replace(/\s+/g, "-");
  let slug = baseSlug;
  let counter = 1;

  // Ensure slug uniqueness
  let unique = false;
  while (!unique) {
    const existing = await prisma.course.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) {
      unique = true;
    } else {
      slug = `${baseSlug}-${counter++}`;
    }
  }

  const created = await prisma.course.create({
    data: {
      slug,
      title,
      description: description ?? "",
      questions: {
        create: questions.map((q) => ({
          text: q.text,
          imageUrl: q.imageUrl ?? null,
          optionsJson: JSON.stringify(q.options),
          answer:
            q.answer ??
            q.options[
              Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length
                ? q.correctOptionIndexes[0]
                : 0
            ] ??
            q.options[0] ??
            "",
          correctOptionIndexesJson: JSON.stringify(
            Array.from(
              new Set(
                (Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes) ||
                  (q.answer ? [q.options.indexOf(q.answer)] : [0]),
              ),
            )
              .filter((i) => Number.isInteger(i) && i >= 0 && i < q.options.length)
              .sort((a, b) => a - b),
          ),
        })),
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

