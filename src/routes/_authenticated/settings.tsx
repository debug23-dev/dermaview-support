import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/Disclaimer";
import { useAuth } from "@/hooks/useAuth";
import { fetchModelStatus } from "@/lib/prediction/prediction.functions";
import { FUSION_CONFIG, MODEL_PATHS, REQUIRED_MODEL_FILES } from "@/lib/prediction/config";
import { DISEASE_CLASSES } from "@/lib/disease-classes";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings & model status — DermaCare AI" },
      {
        name: "description",
        content:
          "Check prediction model availability, fusion weights and the canonical disease class list.",
      },
      { property: "og:title", content: "Settings & model status — DermaCare AI" },
      {
        property: "og:description",
        content: "Model file status and configuration for DermaCare AI.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { fullName, role, user } = useAuth();
  const getStatus = useServerFn(fetchModelStatus);
  const status = useQuery({ queryKey: ["model-status"], queryFn: () => getStatus() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Account, model status and configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Role decides what clinical detail you can see.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="font-semibold">Name:</span> {fullName || "—"}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {user?.email}
          </p>
          <p className="capitalize">
            <span className="font-semibold">Role:</span> {role ?? "not assigned"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prediction model status</CardTitle>
          <CardDescription>
            Predictions stay disabled until real model files are placed locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {status.isLoading ? (
            <p className="text-muted-foreground">Checking model files…</p>
          ) : status.data ? (
            <>
              <p>
                <span className="font-semibold">Image model:</span>{" "}
                {status.data.image_model_available ? "available" : "missing"}
              </p>
              <p>
                <span className="font-semibold">Text model:</span>{" "}
                {status.data.text_model_available ? "available" : "missing"}
              </p>
              <p>
                <span className="font-semibold">Fusion ready:</span>{" "}
                {status.data.fusion_ready ? "yes" : "no"}
              </p>
              <p className="rounded-lg bg-muted/60 p-3">{status.data.message}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Model status unavailable.</p>
          )}

          <div className="rounded-lg border border-border p-3">
            <p className="font-semibold">Expected file locations</p>
            <ul className="mt-1 space-y-1 font-mono text-xs text-muted-foreground">
              {REQUIRED_MODEL_FILES.image.map((f) => (
                <li key={`img-${f}`}>
                  {MODEL_PATHS.image}/{f}
                </li>
              ))}
              {REQUIRED_MODEL_FILES.text.map((f) => (
                <li key={`txt-${f}`}>
                  {MODEL_PATHS.text}/{f}
                </li>
              ))}
            </ul>
          </div>

          <p>
            <span className="font-semibold">Fusion weights:</span> image{" "}
            {FUSION_CONFIG.image_weight}, text {FUSION_CONFIG.text_weight}, uncertainty threshold{" "}
            {FUSION_CONFIG.uncertainty_threshold}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disease classes</CardTitle>
          <CardDescription>
            Class order is fixed — model outputs are aligned to these indices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 text-sm sm:grid-cols-2">
            {DISEASE_CLASSES.map((c) => (
              <li key={c.id} className="rounded-lg bg-muted/60 px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">{c.id}</span>{" "}
                <span className="font-medium">{c.label}</span>
                {c.highPriority ? (
                  <span className="ml-2 text-xs font-semibold text-destructive">high priority</span>
                ) : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Disclaimer />
    </div>
  );
}
