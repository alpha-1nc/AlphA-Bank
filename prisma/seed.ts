import { PrismaClient } from "../src/generated/prisma";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const url = `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.upsert({
    where: { id: "74881cb7-6fa0-4a86-a6b3-cf3e271c7ce0" },
    create: { id: "74881cb7-6fa0-4a86-a6b3-cf3e271c7ce0", name: "JK" },
    update: { name: "JK" },
  });
  await prisma.user.upsert({
    where: { id: "user-my" },
    create: { id: "user-my", name: "MY" },
    update: { name: "MY" },
  });
  console.log(
    "Seeded users: 74881cb7-6fa0-4a86-a6b3-cf3e271c7ce0 (JK), user-my (MY)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
