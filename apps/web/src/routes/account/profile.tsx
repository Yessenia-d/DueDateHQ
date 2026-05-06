import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/components/account/account-pages";

export const Route = createFileRoute("/account/profile")({
  component: ProfilePage,
});
