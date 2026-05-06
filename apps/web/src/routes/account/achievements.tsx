import { createFileRoute } from "@tanstack/react-router";

import { AchievementsPage } from "@/components/account/account-pages";

export const Route = createFileRoute("/account/achievements")({
  component: AchievementsPage,
});
