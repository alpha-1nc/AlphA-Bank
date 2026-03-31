import { prisma } from "@/lib/prisma";
import { ensureDefaultWorkUserId } from "@/lib/work-default-user";
import { normalizeWorkplacesForClient } from "@/lib/workplace-client";
import WorkBoardClient from "@/components/work/WorkBoardClient";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const userId = await ensureDefaultWorkUserId();

  const workplaces = normalizeWorkplacesForClient(
    await prisma.workplace.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })
  );

  return (
    <WorkBoardClient
      userId={userId}
      initialWorkplaces={JSON.parse(JSON.stringify(workplaces))}
    />
  );
}
