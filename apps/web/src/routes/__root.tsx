import { Toaster } from "@due-date-hq/ui/components/sonner";
import { Button } from "@due-date-hq/ui/components/button";
import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import * as React from "react";

import Header from "@/components/header";
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
        title: "due-date-hq",
      },
      {
        name: "description",
        content: "due-date-hq is a web application",
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

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="grid h-svh grid-rows-[auto_1fr]">
          <div className="min-w-0">
            <Header />
            {session.data ? (
              <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
                <div className="min-w-0">
                  <span className="font-medium">{session.data.firm.name}</span>
                  <span className="ml-2 text-muted-foreground">{session.data.user.email}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate()}
                >
                  Log out
                </Button>
              </div>
            ) : null}
          </div>
          <Outlet />
        </div>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
