import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge, StatusBadge, type CaseStatus } from "@/components/StatusBadges";
import { Disclaimer } from "@/components/Disclaimer";
import { getCase, getImageUrl } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { classByLabel } from "@/lib/disease-classes";
import type { RiskLevel } from "@/lib/prediction/risk";
import type { TopPrediction } from "@/lib/prediction/fusion";

export const Route = createFileRoute("/_authenticated/screening/$id")({
  head: () => ({
    meta: [
      { title: "Screening case — DermaCare AI" },
      {
        name: "description",
        content:
          "Review a screening case: lesion photo, symptoms, screening priority and doctor decision.",
      },
      { property: "og:title", content: "Screening case — DermaCare AI" },
      { property: "og:description", content: "Doctor review view for a skin screening case." },
    ],
  }),
  component: CaseDetailPage,
});

const reviewSchema = z.object({
  status: z.enum(["pending_review", "reviewed", "referred", "closed"]),
  doctor_notes: z.string().trim().max(4000).nullable(),
});

function CaseDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { isClinical, user } = useAuth();
  const caseQuery = useQuery({ queryKey: ["case", id], queryFn: () => getCase(id) });
  const c = caseQuery.data;

  const image = useQuery({
    queryKey: ["case-image", c?.image_path],
    queryFn: () => getImageUrl(c?.image_path ?? null),
    enabled: !!c?.image_path,
  });

  const [status, setStatus] = useState<CaseStatus>("pending_review");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (c) {
      setStatus(c.status as CaseStatus);
      setNotes(c.doctor_notes ?? "");
    }
  }, [c]);

  if (caseQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading case…</p>;
  if (!c) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Case not found</h1>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const top3 = Array.isArray(c.top3_predictions_json)
    ? (c.top3_predictions_json as unknown as TopPrediction[])
    : [];
  const cls = classByLabel(c.predicted_class);
  const outcomeLabel = isClinical
    ? (c.predicted_class ?? "Not screened by a model yet")
    : (cls?.patientLabel ?? "Awaiting doctor review");

  const saveReview = async () => {
    const parsed = reviewSchema.safeParse({ status, doctor_notes: notes || null });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("screening_cases")
      .update({
        status: parsed.data.status,
        doctor_notes: parsed.data.doctor_notes,
        reviewed_by: user?.id ?? null,
      })
      .eq("id", c.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["case", c.id] });
    await qc.invalidateQueries({ queryKey: ["cases"] });
    toast.success("Review saved");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Case created {new Date(c.created_at).toLocaleString()}
          </p>
          <h1 className="text-2xl font-bold">{c.patients?.full_name ?? "Screening case"}</h1>
          <p className="text-sm text-muted-foreground">
            {c.affected_area ?? "Unspecified area"}
            {c.duration ? ` · ${c.duration}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={c.risk_level as RiskLevel | null} />
          <StatusBadge status={c.status as CaseStatus} />
          {c.patient_id ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/patients/$id" params={{ id: c.patient_id }}>
                Patient profile
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lesion photo</CardTitle>
            <CardDescription>Private clinic storage, access-controlled.</CardDescription>
          </CardHeader>
          <CardContent>
            {!c.image_path ? (
              <p className="text-sm text-muted-foreground">No photo attached to this case.</p>
            ) : image.data ? (
              <img
                src={image.data}
                alt={`Lesion photo for ${c.affected_area ?? "screening case"}`}
                className="max-h-80 w-full rounded-xl border border-border object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading photo…</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reported symptoms</CardTitle>
            <CardDescription>Structured input recorded at intake.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-semibold">Itching:</span> {c.itching_level}/10 ·{" "}
              <span className="font-semibold">Pain:</span> {c.pain_level}/10
            </p>
            <p className="text-muted-foreground">
              {[
                c.redness && "redness",
                c.swelling && "swelling",
                c.bleeding && "bleeding",
                c.discharge && "discharge",
                c.spreading && "spreading",
                c.fever && "fever",
              ]
                .filter(Boolean)
                .join(", ") || "No additional signs reported"}
            </p>
            {c.symptom_description ? (
              <p className="whitespace-pre-line rounded-lg bg-muted/60 p-3">
                {c.symptom_description}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screening outcome</CardTitle>
          <CardDescription>
            {isClinical
              ? "Model confidence and alternatives are shown to doctors and admins only."
              : "Assistants see the final outcome and recommendation only."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Most likely condition
            </p>
            <p className="mt-0.5 text-base font-semibold">{outcomeLabel}</p>
          </div>

          {isClinical ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Confidence
                </p>
                <p className="mt-0.5">
                  {c.confidence === null
                    ? "Unavailable — no model result stored."
                    : `${Math.round(c.confidence * 100)}%`}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Top 3 possibilities
                </p>
                {top3.length === 0 ? (
                  <p className="mt-0.5 text-muted-foreground">
                    Not available until model files are installed.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {top3.map((t) => (
                      <li
                        key={t.class_id}
                        className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5"
                      >
                        <span>{t.label}</span>
                        <span className="font-semibold">
                          {Math.round((t.probability ?? 0) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recommendation
            </p>
            <p className="mt-0.5">{c.recommendation ?? "Awaiting doctor review."}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor review</CardTitle>
          <CardDescription>
            {isClinical
              ? "Record the clinical decision for this case."
              : "Only doctors and admins can change the review decision."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="status">Case status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CaseStatus)}
              disabled={!isClinical}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_review">Pending review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="referred">Referred</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doctor_notes">Doctor notes</Label>
            <Textarea
              id="doctor_notes"
              value={notes}
              maxLength={4000}
              rows={4}
              disabled={!isClinical}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Clinical impression, treatment plan, referral details…"
            />
          </div>
          {isClinical ? (
            <Button onClick={saveReview} disabled={busy}>
              {busy ? "Saving…" : "Save review"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Disclaimer />
    </div>
  );
}
