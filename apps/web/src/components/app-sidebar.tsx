import { Button } from "@due-date-hq/ui/components/button";
import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, LogOut, Shield, Users } from "lucide-react";

interface AppSidebarProps {
  firmName?: string;
  userEmail?: string;
  isLoggingOut?: boolean;
  onLogout: () => void;
}

const workspaceLinks = [
  { to: "/", label: "Monday triage", icon: CalendarDays },
  { to: "/coverage", label: "Coverage", icon: Shield },
  { to: "/clients/new", label: "Clients", icon: Users },
] as const;

export function AppSidebar({ firmName, isLoggingOut, onLogout, userEmail }: AppSidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="sticky top-0 flex h-svh w-[236px] flex-col border-r border-border bg-card/90 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <div className="grid size-[30px] place-items-center rounded-lg border border-ddhq-border-strong bg-card text-sm font-bold text-primary">
          D
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-tight">DueDateHQ</div>
          <div className="text-xs text-ddhq-ink-soft">Verified operations</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <div className="mb-2 mt-4 px-2 text-[11px] font-semibold uppercase text-ddhq-ink-soft">
          Workspace
        </div>
        {workspaceLinks.map((link) => {
          const isActive =
            link.to === "/"
              ? pathname === "/"
              : pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex min-h-[34px] w-full items-center gap-2 rounded-lg border px-2 text-sm transition-colors ${
                isActive
                  ? "border-border bg-card text-foreground shadow-[0_1px_1px_rgb(38_31_20/0.03)]"
                  : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/50"
              }`}
            >
              <link.icon className="size-4 shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {(firmName || userEmail) && (
        <div className="border-t border-border px-4 py-3">
          <div className="min-w-0 text-xs">
            {firmName && (
              <div className="truncate font-medium text-foreground">{firmName}</div>
            )}
            {userEmail && (
              <div className="mt-0.5 truncate text-muted-foreground">{userEmail}</div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground"
            disabled={isLoggingOut}
            onClick={onLogout}
          >
            <LogOut className="size-3.5" />
            Log out
          </Button>
        </div>
      )}
    </aside>
  );
}

export function AppSidebarContent({
  firmName,
  isLoggingOut,
  onLogout,
  userEmail,
}: AppSidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <div className="grid size-[30px] place-items-center rounded-lg border border-ddhq-border-strong bg-card text-sm font-bold text-primary">
          D
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-tight">DueDateHQ</div>
          <div className="text-xs text-ddhq-ink-soft">Verified operations</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <div className="mb-2 mt-4 px-2 text-[11px] font-semibold uppercase text-ddhq-ink-soft">
          Workspace
        </div>
        {workspaceLinks.map((link) => {
          const isActive =
            link.to === "/"
              ? pathname === "/"
              : pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex min-h-[34px] w-full items-center gap-2 rounded-lg border px-2 text-sm transition-colors ${
                isActive
                  ? "border-border bg-card text-foreground shadow-[0_1px_1px_rgb(38_31_20/0.03)]"
                  : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/50"
              }`}
            >
              <link.icon className="size-4 shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {(firmName || userEmail) && (
        <div className="border-t border-border px-4 py-3">
          <div className="min-w-0 text-xs">
            {firmName && (
              <div className="truncate font-medium text-foreground">{firmName}</div>
            )}
            {userEmail && (
              <div className="mt-0.5 truncate text-muted-foreground">{userEmail}</div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground"
            disabled={isLoggingOut}
            onClick={onLogout}
          >
            <LogOut className="size-3.5" />
            Log out
          </Button>
        </div>
      )}
    </div>
  );
}
