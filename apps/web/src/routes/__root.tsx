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
import { NoticeAlertBanner } from "@/components/notices/notice-alert-banner";
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
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
  }),
});

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isMarketingRoute = pathname === "/";
  const isPublicRoute = isMarketingRoute || pathname === "/login" || pathname === "/progress";
  const session = useQuery({
    ...trpc.auth.session.queryOptions(),
    enabled: !isMarketingRoute && pathname !== "/progress",
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const logout = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      window.location.assign("/login");
    },
  });
  React.useEffect(() => {
    if (!isPublicRoute && !session.isPending && !session.data) {
      window.location.assign("/login");
    }
  }, [isPublicRoute, session.data, session.isPending]);

  const handleLogout = React.useCallback(() => logout.mutate(), [logout]);
  const handleMobileNavigate = React.useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

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
          <div className="grid h-svh grid-cols-1 bg-background lg:grid-cols-[236px_minmax(0,1fr)]">
            {/* Desktop sidebar */}
            <div className="hidden lg:block">
              <AppSidebar
                firmName={session.data?.firm.name}
                userEmail={session.data?.user.email}
                userImage={session.data?.user.image}
                userName={session.data?.user.name}
                isLoggingOut={logout.isPending}
                onLogout={handleLogout}
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-col">
              {/* Mobile top bar + sheet sidebar */}
              <div className="flex items-center gap-2 border-b border-ddhq-line bg-ddhq-paper px-3 py-2 lg:hidden">
                <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
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
                      userImage={session.data?.user.image}
                      userName={session.data?.user.name}
                      isLoggingOut={logout.isPending}
                      onNavigate={handleMobileNavigate}
                      onLogout={handleLogout}
                    />
                  </SheetContent>
                </Sheet>
                <span className="text-sm font-semibold">DueDateHQ</span>
              </div>

              {session.data ? <NoticeAlertBanner /> : null}

              <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-background">
                <Outlet />
              </div>
            </div>
          </div>
        )}
        <Toaster position="top-right" richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
