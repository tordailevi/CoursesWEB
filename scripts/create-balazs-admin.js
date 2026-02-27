/* eslint-disable @typescript-eslint/no-require-imports */

process.env.DATABASE_URL = "file:./dev.db";

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const prisma = new PrismaClient();
  try {
    let user = await prisma.user.findUnique({ where: { username: "Balazs" } });

    if (!user) {
      const passwordHash = await bcrypt.hash("FarkasBalazsBoss", 10);
      user = await prisma.user.create({
        data: {
          username: "Balazs",
          passwordHash,
          role: "admin",
        },
      });
      console.log("Created user:", {
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } else {
      console.log("User already exists:", {
        id: user.id,
        username: user.username,
        role: user.role,
      });
      if (user.role !== "admin") {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { role: "admin" },
        });
        console.log("Updated role to admin for user:", {
          id: updated.id,
          username: updated.username,
          role: updated.role,
        });
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

