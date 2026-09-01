import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, FileWarning, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskBadge, StatusBadge, type CaseStatus } from "@/components/StatusBadges";
import { Disclaimer } from "@/components/Disclaimer";
import { listCases, listPatients } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import type { RiskLevel } from "@/lib/prediction/risk";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DermaCare AI" },
      {
        name: "description",
        content:
          "Clinic overview of patients, screening cases, risk-priority summary and cases pending doctor review.",
      },
      { property: "og:title", content: "Dashboard — DermaCare AI" },
      {
        property: "og:description",
        content: "Patients, screening cases and pending reviews at a glance.",
      },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-3xl font-bold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { isClinical } = useAuth();
  const patients = useQuery({ queryKey: ["patients", ""], queryFn: () => listPatients() });
  const cases = useQuery({ queryKey: ["cases"], queryFn: () => listCases(100) });

  const rows = cases.data ?? [];
  const pending = rows.filter((c) => c.status === "pending_review");
  const riskCounts: Record<RiskLevel | "unscreened", number> = {
    high: 0,
    moderate: 0,
    low: 0,
    unscreened: 0,
  };
  for (const c of rows) {
    if (c.risk_level) riskCounts[c.risk_level as RiskLevel] += 1;
    else riskCounts.unscreened += 1;
  }

  const diseaseCounts = rows.reduce<Record<string, number>>((acc, c) => {
    const key = c.predicted_class ?? "Not screened yet";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clinic dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Screening activity, review queue and priority summary.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/patients/new">Add patient</Link>
          </Button>
          <Button asChild>
            <Link to="/screening/new" search={{ patient: undefined }}>New screening</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total patients" value={patients.data?.length ?? 0} icon={Users} />
        <StatCard label="Screening cases" value={rows.length} icon={ClipboardList} />
        <StatCard label="Pending review" value={pending.length} icon={FileWarning} />
        <StatCard
          label="High priority"
          value={riskCounts.high}
          icon={AlertTriangle}
          hint="Screening priority only"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk-priority summary</CardTitle>
            <CardDescription>Triage priority, not a severity diagnosis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["high", "moderate", "low"] as RiskLevel[]).map((lvl) => (
              <div key={lvl} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                <RiskBadge level={lvl} />
                <span className="text-sm font-semibold">{riskCounts[lvl]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
              <RiskBadge level={null} />
              <span className="text-sm font-semibold">{riskCounts.unscreened}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Predicted condition summary</CardTitle>
            <CardDescription>
              {isClinical
                ? "Populated once local model files are installed."
                : "Final screening outcomes only."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(diseaseCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases recorded yet.</p>
            ) : (
              Object.entries(diseaseCounts).map(([label, count]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm"
                >
                  <span>{label}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent cases</CardTitle>
          <CardDescription>Latest screening submissions across the clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          {cases.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading cases…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No screening cases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Patient</th>
                    <th className="py-2 pr-4 font-semibold">Area</th>
                    <th className="py-2 pr-4 font-semibold">Priority</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Created</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium">{c.patients?.full_name ?? "—"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.patients?.patient_code}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">{c.affected_area ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <RiskBadge level={c.risk_level as RiskLevel | null} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <StatusBadge status={c.status as CaseStatus} />
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link
                          to="/screening/$id"
                          params={{ id: c.id }}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Disclaimer />
    </div>
  );
}
