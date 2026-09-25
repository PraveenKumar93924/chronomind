import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Brain,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timeline", label: "Timeline", icon: Clock },
  { to: "/memories", label: "My Memories", icon: Brain },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/ask", label: "Ask My Memory", icon: MessageSquareText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-full flex-col gap-2 bg-sidebar p-4 text-sidebar-foreground">
      <Link to="/dashboard" className="mb-4 flex items-center gap-3 px-2 py-1" onClick={onNavigate}>
        <span className="brand-gradient flex size-9 items-center justify-center rounded-xl">
          <Brain className="size-4 text-primary-foreground" />
        </span>
        <span className="font-display text-base font-semibold">ChronoMind</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border pt-3">
        <Link
          to="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <div className="px-3 pt-2 pb-1 text-xs break-all text-muted-foreground">{user?.email}</div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
