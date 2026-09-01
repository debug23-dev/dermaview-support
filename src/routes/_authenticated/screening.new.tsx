import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AlertTriangle, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/Disclaimer";
import { listPatients, uploadLesionImage } from "@/lib/data";
import { assessRisk, type StructuredSymptoms } from "@/lib/prediction/risk";

export const Route = createFileRoute("/_authenticated/screening/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    patient: typeof search["patient"] === "string" ? (search["patient"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New screening — DermaCare AI" },
      {
        name: "description",
        content:
          "Capture a lesion photo, structured symptoms and clinical notes to create a screening case for doctor review.",
      },
      { property: "og:title", content: "New screening — DermaCare AI" },
      {
        property: "og:description",
        content: "Create a skin screening case with image and symptom input.",
      },
    ],
  }),
  component: NewScreeningPage,
});

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const schema = z.object({
  patient_id: z.string().uuid({ message: "Select a patient" }),
  affected_area: z.string().trim().min(2, { message: "Affected area is required" }).max(120),
  duration: z.string().trim().max(80).nullable(),
  symptom_description: z.string().trim().max(4000).nullable(),
});

const flags = [
  { key: "redness", label: "Redness" },
  { key: "swelling", label: "Swelling" },
  { key: "bleeding", label: "Bleeding" },
  { key: "discharge", label: "Discharge / pus" },
  { key: "spreading", label: "Spreading" },
  { key: "fever", label: "Fever" },
] as const;

function NewScreeningPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { patient: presetPatient } = Route.useSearch();

  const patients = useQuery({ queryKey: ["patients", ""], queryFn: () => listPatients() });
  const [patientId, setPatientId] = useState(presetPatient ?? "");
  const [affectedArea, setAffectedArea] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [itching, setItching] = useState(0);
  const [pain, setPain] = useState(0);
  type SignKey = "redness" | "swelling" | "bleeding" | "discharge" | "spreading" | "fever";
  const [checks, setChecks] = useState<Record<SignKey, boolean>>({
    redness: false,
    swelling: false,
    bleeding: false,
    discharge: false,
    spreading: false,
    fever: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modelNotice, setModelNotice] = useState<string | null>(null);

  const symptoms: StructuredSymptoms = useMemo(
    () => ({
      itching_level: itching,
      pain_level: pain,
      redness: checks.redness,
      swelling: checks.swelling,
      bleeding: checks.bleeding,
      discharge: checks.discharge,
      spreading: checks.spreading,
      fever: checks.fever,
    }),
    [itching, pain, checks],
  );

  const onFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be 10MB or smaller.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      patient_id: patientId,
      affected_area: affectedArea,
      duration: duration || null,
      symptom_description: description || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }

    setBusy(true);
    setModelNotice(null);
    try {
      let imagePath: string | null = null;
      if (file) imagePath = await uploadLesionImage(file, parsed.data.patient_id);

      // Ask the prediction endpoint for a multimodal result. While model files
      // are absent it returns 503 and the case is stored without a prediction.
      let predicted: {
        predicted_class: string;
        confidence: number;
        top3: unknown;
      } | null = null;

      if (file) {
        const form = new FormData();
        form.set("patient_id", parsed.data.patient_id);
        form.set("image", file);
        form.set("symptom_text", parsed.data.symptom_description ?? "");
        form.set("symptoms", JSON.stringify(symptoms));
        const res = await fetch("/api/predict", { method: "POST", body: form });
        if (res.ok) {
          predicted = await res.json();
        } else {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setModelNotice(body.error ?? "Prediction is unavailable.");
        }
      } else {
        setModelNotice("No image attached — the case was saved for doctor review only.");
      }

      const risk = assessRisk(null, symptoms);
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("screening_cases")
        .insert({
          patient_id: parsed.data.patient_id,
          affected_area: parsed.data.affected_area,
          duration: parsed.data.duration,
          symptom_description: parsed.data.symptom_description,
          itching_level: itching,
          pain_level: pain,
          redness: checks.redness,
          swelling: checks.swelling,
          bleeding: checks.bleeding,
          discharge: checks.discharge,
          spreading: checks.spreading,
          fever: checks.fever,
          image_path: imagePath,
          predicted_class: predicted?.predicted_class ?? null,
          confidence: predicted?.confidence ?? null,
          top3_predictions_json: (predicted?.top3 as never) ?? null,
          risk_level: risk.risk_level,
          recommendation: risk.recommendation,
          status: "pending_review",
          created_by: auth.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      await qc.invalidateQueries({ queryKey: ["cases"] });
      await qc.invalidateQueries({ queryKey: ["patient-cases", parsed.data.patient_id] });
      toast.success("Screening case created");
      await router.navigate({ to: "/screening/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the screening case.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New screening case</h1>
        <p className="text-sm text-muted-foreground">
          Lesion photo plus structured symptoms. Results are screening support, never a diagnosis.
        </p>
      </div>

      {modelNotice ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p>{modelNotice}</p>
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1 · Patient & lesion</CardTitle>
            <CardDescription>Pick the patient and describe the affected area.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="patient">Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger id="patient">
                  <SelectValue placeholder={patients.isLoading ? "Loading…" : "Select patient"} />
                </SelectTrigger>
                <SelectContent>
                  {(patients.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} · {p.patient_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Missing?{" "}
                <Link to="/patients/new" className="font-semibold text-primary hover:underline">
                  Register a patient
                </Link>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area">Affected area</Label>
              <Input
                id="area"
                value={affectedArea}
                maxLength={120}
                onChange={(e) => setAffectedArea(e.target.value)}
                placeholder="Left forearm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={duration}
                maxLength={80}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="3 weeks"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2 · Lesion photo</CardTitle>
            <CardDescription>
              JPEG, PNG or WebP up to 10MB. Stored privately in clinic storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Label
                htmlFor="image"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <Upload className="size-4" aria-hidden />
                {file ? "Change photo" : "Choose photo"}
              </Label>
              <input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <span className="text-sm text-muted-foreground">{file.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">No photo selected</span>
              )}
            </div>
            {preview ? (
              <img
                src={preview}
                alt="Selected lesion photo preview"
                className="max-h-64 rounded-xl border border-border object-contain"
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3 · Symptoms</CardTitle>
            <CardDescription>
              Structured input feeds the future text model and the priority logic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itching">Itching level: {itching}/10</Label>
                <Slider
                  id="itching"
                  value={[itching]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(v) => setItching(v[0] ?? 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pain">Pain level: {pain}/10</Label>
                <Slider
                  id="pain"
                  value={[pain]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(v) => setPain(v[0] ?? 0)}
                />
              </div>
            </div>

            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="mb-1 text-sm font-medium">Observed signs</legend>
              {flags.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!checks[f.key]}
                    onCheckedChange={(v) => setChecks((c) => ({ ...c, [f.key]: v === true }))}
                  />
                  {f.label}
                </label>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="description">Symptom description</Label>
              <Textarea
                id="description"
                value={description}
                maxLength={4000}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scaly red patch, worse at night, no recent travel…"
              />
            </div>
          </CardContent>
        </Card>

        <Disclaimer />

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Create case"}
          </Button>
          <Button asChild variant="outline" type="button">
            <Link to="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
