import { PrismaClient } from "../src/generated/prisma";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const url = `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.upsert({
    where: { id: "user-jk" },
    create: { id: "user-jk", name: "JK" },
    update: { name: "JK" },
  });
  await prisma.user.upsert({
    where: { id: "user-my" },
    create: { id: "user-my", name: "MY" },
    update: { name: "MY" },
  });
  console.log("Seeded users: user-jk (JK), user-my (MY)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
