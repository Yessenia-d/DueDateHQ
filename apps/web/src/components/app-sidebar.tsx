import { Button } from "@due-date-hq/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@due-date-hq/ui/components/dropdown-menu";
import { cn } from "@due-date-hq/ui/lib/utils";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BellRing,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  FileUp,
  LogOut,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import * as React from "react";

interface AppSidebarProps {
  firmName?: string;
  userEmail?: string;
  userImage?: string | null;
  userName?: string | null;
  isLoggingOut?: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}

const sidebarSections = [
  {
    label: "Work",
    links: [
      { to: "/", label: "Dashboard", icon: CalendarDays },
      { to: "/import", label: "Import", icon: FileUp },
      { to: "/tax-work", label: "Tax Work", icon: ClipboardList },
    ],
  },
  {
    label: "Management",
    links: [
      { to: "/clients", label: "Clients", icon: Users },
      { to: "/notices", label: "Notices", icon: BellRing },
      { to: "/coverage", label: "Coverage", icon: Shield },
    ],
  },
] as const;

const accountMenuLinks = [
  { to: "/account/profile", label: "Profile", icon: CircleUserRound },
  { to: "/account/settings", label: "Settings", icon: Settings },
  { to: "/account/achievements", label: "Achievements", icon: TrendingUp },
] as const;

export function AppSidebar({
  firmName,
  isLoggingOut,
  onNavigate,
  onLogout,
  userEmail,
  userImage,
  userName,
}: AppSidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="sticky top-0 flex h-svh w-[236px] flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <div className="grid size-[30px] place-items-center rounded-lg border border-ddhq-border-strong bg-card text-sm font-bold text-primary">
          D
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-tight">DueDateHQ</div>
          <div className="text-xs text-ddhq-ink-soft">Verified operations</div>
        </div>
      </div>

      <SidebarNav onNavigate={onNavigate} pathname={pathname} />

      <SidebarAccountMenu
        firmName={firmName}
        isLoggingOut={isLoggingOut}
        onNavigate={onNavigate}
        onLogout={onLogout}
        pathname={pathname}
        userEmail={userEmail}
        userImage={userImage}
        userName={userName}
      />
    </aside>
  );
}

export function AppSidebarContent({
  firmName,
  isLoggingOut,
  onNavigate,
  onLogout,
  userEmail,
  userImage,
  userName,
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

      <SidebarNav onNavigate={onNavigate} pathname={pathname} />

      <SidebarAccountMenu
        firmName={firmName}
        isLoggingOut={isLoggingOut}
        onNavigate={onNavigate}
        onLogout={onLogout}
        pathname={pathname}
        userEmail={userEmail}
        userImage={userImage}
        userName={userName}
      />
    </div>
  );
}

function SidebarNav({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3">
      {sidebarSections.map((section, sectionIndex) => (
        <div key={section.label} className={sectionIndex === 0 ? "mt-4" : "mt-5"}>
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase text-ddhq-ink-soft">
            {section.label}
          </div>
          <div className="grid gap-1">
            {section.links.map((link) => {
              const isActive =
                link.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onNavigate}
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
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarAccountMenu({
  firmName,
  isLoggingOut,
  onNavigate,
  onLogout,
  pathname,
  userEmail,
  userImage,
  userName,
}: AppSidebarProps & { pathname: string }) {
  const navigate = useNavigate();
  const primaryLabel = firmName || userName || userEmail || "Account";
  const secondaryLabel = userEmail || userName || "Account settings";

  if (!firmName && !userEmail && !userName) {
    return null;
  }

  return (
    <div className="border-t border-border px-3 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-h-12 w-full justify-between gap-2 rounded-lg px-2 py-2 text-left"
              aria-label={`Open account menu for ${secondaryLabel}`}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <AccountAvatar image={userImage} label={primaryLabel} />
            <span className="min-w-0 text-xs">
              <span className="block truncate font-medium text-foreground">
                {primaryLabel}
              </span>
              <span className="mt-0.5 block truncate text-muted-foreground">
                {secondaryLabel}
              </span>
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[220px] rounded-lg p-1.5"
          side="top"
          sideOffset={8}
        >
          <div className="px-2 py-2">
            <div className="text-[11px] font-medium uppercase text-muted-foreground">
              Signed in
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-foreground">
              {userName || userEmail || "Current user"}
            </div>
            {firmName ? (
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {firmName}
              </div>
            ) : null}
          </div>
          <DropdownMenuSeparator className="my-1" />
          {accountMenuLinks.map((link) => {
            const isActive = pathname === link.to;

            return (
              <DropdownMenuItem
                key={link.to}
                className={cn(
                  "rounded-md text-sm",
                  isActive && "bg-ddhq-accent-soft text-foreground",
                )}
                onClick={() => {
                  void navigate({ to: link.to });
                  onNavigate?.();
                }}
              >
                <link.icon className="size-4" />
                {link.label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            variant="destructive"
            className="rounded-md text-sm"
            disabled={isLoggingOut}
            onClick={onLogout}
          >
            <LogOut className="size-4" />
            {isLoggingOut ? "Logging out" : "Log out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AccountAvatar({ image, label }: { image?: string | null; label: string }) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const initial = label.slice(0, 1).toUpperCase();

  React.useEffect(() => {
    setHasImageError(false);
  }, [image]);

  if (image && !hasImageError) {
    return (
      <img
        alt=""
        className="size-8 shrink-0 rounded-lg border border-border bg-background object-cover"
        src={image}
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background text-xs font-semibold text-primary">
      {initial}
    </span>
  );
}
