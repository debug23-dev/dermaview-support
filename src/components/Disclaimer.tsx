import { ShieldAlert } from "lucide-react";
import { MEDICAL_DISCLAIMER } from "@/lib/prediction/risk";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground ${className}`}
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="leading-relaxed">
        <span className="font-semibold">Medical safety notice: </span>
        {MEDICAL_DISCLAIMER}
      </p>
    </div>
  );
}
