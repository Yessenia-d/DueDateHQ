import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "@/components/account/account-pages";

export const Route = createFileRoute("/account/settings")({
  component: SettingsPage,
});
