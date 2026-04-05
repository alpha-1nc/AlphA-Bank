import SettingsClient from "@/components/settings/SettingsClient";
import { getSystemSettings } from "@/app/actions/settings";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getUserProfile } from "@/lib/user-profiles";
import { normalizeWorkplacesForClient } from "@/lib/workplace-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const systemSettings = await getSystemSettings();
  const userId = await getCurrentUserId();
  const currentProfile = getUserProfile(userId)!;
  const workplaces = normalizeWorkplacesForClient(
    await prisma.workplace.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    })
  );

  return (
    <SettingsClient
      initialBudgetStartDate={systemSettings.budgetStartDate}
      initialWorkplaces={JSON.parse(JSON.stringify(workplaces))}
      currentUserId={userId}
      currentProfileName={currentProfile.name}
      currentProfileInitial={currentProfile.initial}
    />
  );
}
