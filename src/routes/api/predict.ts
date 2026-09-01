import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { FUSION_CONFIG, MODEL_MISSING_MESSAGE } from "@/lib/prediction/config";

/**
 * POST /api/predict
 *
 * Contract (multipart/form-data):
 *   patient_id  : uuid (required)
 *   image       : File (required)
 *   symptom_text: string (optional, max 4000)
 *   symptoms    : JSON string of structured symptoms (optional)
 *
 * While model files are absent this endpoint returns HTTP 503 with a clear
 * error. It NEVER fabricates a prediction.
 */
const symptomsSchema = z
  .object({
    itching_level: z.number().min(0).max(10).optional(),
    pain_level: z.number().min(0).max(10).optional(),
    redness: z.boolean().optional(),
    swelling: z.boolean().optional(),
    bleeding: z.boolean().optional(),
    discharge: z.boolean().optional(),
    spreading: z.boolean().optional(),
    fever: z.boolean().optional(),
  })
  .partial();

const inputSchema = z.object({
  patient_id: z.string().uuid({ message: "patient_id must be a valid uuid" }),
  symptom_text: z.string().trim().max(4000).optional(),
  symptoms: symptomsSchema.optional(),
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/predict")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json(
            { error: "Expected multipart/form-data with patient_id, image and symptom fields." },
            400,
          );
        }

        const rawSymptoms = form.get("symptoms");
        let parsedSymptoms: unknown = undefined;
        if (typeof rawSymptoms === "string" && rawSymptoms.length > 0) {
          try {
            parsedSymptoms = JSON.parse(rawSymptoms);
          } catch {
            return json({ error: "symptoms must be a JSON object string." }, 400);
          }
        }

        const parsed = inputSchema.safeParse({
          patient_id: form.get("patient_id"),
          symptom_text: (form.get("symptom_text") as string | null) ?? undefined,
          symptoms: parsedSymptoms,
        });
        if (!parsed.success) {
          return json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, 400);
        }

        const image = form.get("image");
        if (!(image instanceof File) || image.size === 0) {
          return json({ error: "An image file is required." }, 400);
        }
        if (!image.type.startsWith("image/")) {
          return json({ error: "Uploaded file must be an image." }, 400);
        }

        const { getModelStatus } = await import("@/lib/prediction/model-loader.server");
        const status = getModelStatus();

        if (!status.fusion_ready) {
          return json(
            {
              error: MODEL_MISSING_MESSAGE,
              prediction_enabled: false,
              model_status: status,
              fusion_config: FUSION_CONFIG,
            },
            503,
          );
        }

        // Real integration point. Until runImageModel/runTextModel are
        // implemented against local model files, this path stays unreachable.
        return json(
          {
            error:
              "Model files were detected but the image/text inference services are not implemented yet. See MODEL_INTEGRATION_GUIDE.md.",
            prediction_enabled: false,
            model_status: status,
          },
          501,
        );
      },
    },
  },
});
