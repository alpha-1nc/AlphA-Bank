import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { normalizeWorkplacesForClient } from "@/lib/workplace-client";
import WorkBoardClient from "@/components/work/WorkBoardClient";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const userId = await getCurrentUserId();

  const workplaces = normalizeWorkplacesForClient(
    await prisma.workplace.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })
  );

  return (
    <WorkBoardClient
      initialWorkplaces={JSON.parse(JSON.stringify(workplaces))}
    />
  );
}
