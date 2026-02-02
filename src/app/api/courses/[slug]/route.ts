import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: {
    slug: string;
  };
};

export async function GET(_req: Request, { params }: Params) {
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      questions: {
        select: {
          id: true,
          text: true,
          optionsJson: true,
          answer: true,
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
    questions: course.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.optionsJson) as string[],
      answer: q.answer,
    })),
  };

  return NextResponse.json(mapped);
}

