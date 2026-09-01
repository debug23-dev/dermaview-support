import { Link, useRouter } from "@tanstack/react-router";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  ScanLine,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/screening/new", label: "New screening", icon: ScanLine },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { fullName, role, user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    await router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block font-display text-base font-bold leading-tight">DermaCare AI</span>
            <span className="block text-xs text-muted-foreground">Skin screening support</span>
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              search={to === "/screening/new" ? { patient: undefined } : undefined}
              className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold bg-sidebar-accent text-sidebar-accent-foreground",
              }}
              activeOptions={{ exact: to === "/dashboard" }}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-5 lg:mt-auto lg:block">
          <div className="rounded-xl border border-sidebar-border bg-card p-3 text-xs">
            <p className="flex items-center gap-1.5 font-semibold">
              <Activity className="size-3.5 text-primary" aria-hidden /> Prediction disabled
            </p>
            <p className="mt-1 text-muted-foreground">
              Model files are not installed. See Settings for setup steps.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullName || user?.email}</p>
            <p className="text-xs capitalize text-muted-foreground">{role ?? "no role assigned"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7">{children}</main>
      </div>
    </div>
  );
}
