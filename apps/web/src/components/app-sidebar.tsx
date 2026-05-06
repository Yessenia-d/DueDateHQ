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
      { to: "/dashboard", label: "Dashboard", icon: CalendarDays },
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
    <aside className="sticky top-0 flex h-svh w-[236px] flex-col border-r border-ddhq-line bg-sidebar">
      <div className="flex items-center gap-2.5 px-4 pt-6 pb-5">
        <div className="grid size-[30px] place-items-center rounded-lg border border-ddhq-line bg-ddhq-paper-raised text-sm font-bold text-primary shadow-[0_1px_0_oklch(0.44_0.025_78/0.04)]">
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
      <div className="flex items-center gap-2.5 px-4 pt-6 pb-5">
        <div className="grid size-[30px] place-items-center rounded-lg border border-ddhq-line bg-ddhq-paper-raised text-sm font-bold text-primary shadow-[0_1px_0_oklch(0.44_0.025_78/0.04)]">
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
        <div key={section.label} className={sectionIndex === 0 ? "mt-3" : "mt-6"}>
          <div className="mb-2.5 px-2 text-[11px] font-semibold uppercase text-ddhq-ink-soft">
            {section.label}
          </div>
          <div className="grid gap-1.5">
            {section.links.map((link) => {
              const isActive =
                link.to === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onNavigate}
                  className={`flex min-h-[34px] w-full items-center gap-2 rounded-[7px] border px-2 text-sm transition-colors ${
                    isActive
                      ? "border-ddhq-line bg-ddhq-paper-raised text-foreground shadow-[0_1px_0_oklch(0.44_0.025_78/0.045)]"
                      : "border-transparent text-muted-foreground hover:bg-ddhq-paper-muted/70 hover:text-foreground"
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
    <div className="border-t border-ddhq-line px-3 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-h-12 w-full justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-ddhq-paper-muted/70"
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
