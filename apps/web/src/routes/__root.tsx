import { Button } from "@due-date-hq/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@due-date-hq/ui/components/sheet";
import { Toaster } from "@due-date-hq/ui/components/sonner";
import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Menu } from "lucide-react";
import * as React from "react";

import { AppSidebar, AppSidebarContent } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "DueDateHQ",
      },
      {
        name: "description",
        content: "Tax deadline operating system for solo CPAs",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const session = useQuery(trpc.auth.session.queryOptions());
  const logout = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      window.location.assign("/login");
    },
  });
  const isPublicRoute = pathname === "/login" || pathname === "/progress";

  React.useEffect(() => {
    if (!isPublicRoute && !session.isPending && !session.data) {
      window.location.assign("/login");
    }
  }, [isPublicRoute, session.data, session.isPending]);

  const handleLogout = React.useCallback(() => logout.mutate(), [logout]);

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        {isPublicRoute ? (
          <Outlet />
        ) : (
          <div className="grid h-svh grid-cols-1 lg:grid-cols-[236px_minmax(0,1fr)]">
            {/* Desktop sidebar */}
            <div className="hidden lg:block">
              <AppSidebar
                firmName={session.data?.firm.name}
                userEmail={session.data?.user.email}
                isLoggingOut={logout.isPending}
                onLogout={handleLogout}
              />
            </div>

            {/* Mobile top bar + sheet sidebar */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2 lg:hidden">
              <Sheet>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Open navigation" />
                  }
                >
                  <Menu className="size-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[236px] p-0" showCloseButton={false}>
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <AppSidebarContent
                    firmName={session.data?.firm.name}
                    userEmail={session.data?.user.email}
                    isLoggingOut={logout.isPending}
                    onLogout={handleLogout}
                  />
                </SheetContent>
              </Sheet>
              <span className="text-sm font-semibold">DueDateHQ</span>
            </div>

            <div className="min-h-0 min-w-0 overflow-auto">
              <Outlet />
            </div>
          </div>
        )}
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
