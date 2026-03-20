import SettingsClient from "@/components/settings/SettingsClient";
import { getSystemSettings } from "@/app/actions/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const systemSettings = await getSystemSettings();
  return <SettingsClient initialBudgetStartDate={systemSettings.budgetStartDate} />;
}
