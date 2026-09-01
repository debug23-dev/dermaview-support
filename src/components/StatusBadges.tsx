import type { RiskLevel } from "@/lib/prediction/risk";

const riskStyles: Record<RiskLevel, string> = {
  low: "border-success/40 bg-success/12 text-success",
  moderate: "border-warning/50 bg-warning/15 text-warning",
  high: "border-destructive/40 bg-destructive/12 text-destructive",
};

const riskLabel: Record<RiskLevel, string> = {
  low: "Low priority",
  moderate: "Moderate priority",
  high: "High priority",
};

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold";

export function RiskBadge({ level }: { level: RiskLevel | null | undefined }) {
  if (!level) {
    return (
      <span className={`${base} border-border bg-muted text-muted-foreground`}>Not screened</span>
    );
  }
  return <span className={`${base} ${riskStyles[level]}`}>{riskLabel[level]}</span>;
}

export type CaseStatus = "pending_review" | "reviewed" | "referred" | "closed";

const statusStyles: Record<CaseStatus, string> = {
  pending_review: "border-warning/50 bg-warning/12 text-warning",
  reviewed: "border-success/40 bg-success/12 text-success",
  referred: "border-destructive/40 bg-destructive/12 text-destructive",
  closed: "border-border bg-muted text-muted-foreground",
};

const statusLabel: Record<CaseStatus, string> = {
  pending_review: "Pending review",
  reviewed: "Reviewed",
  referred: "Referred",
  closed: "Closed",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`${base} ${statusStyles[status]}`}>{statusLabel[status]}</span>;
}
