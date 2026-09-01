import { existsSync, readdirSync } from "node:fs";
import { MODEL_MISSING_MESSAGE, MODEL_PATHS, REQUIRED_MODEL_FILES } from "./config";
import type { ModelStatus } from "./config";

/**
 * Server-only model discovery.
 *
 * IMPORTANT: no model files are bundled with this repository and nothing is
 * ever downloaded from cloud storage (Google Drive, S3, ...) at prediction
 * time. The operator places real model artefacts on local disk under
 * backend/models/image and backend/models/text. See MODEL_INTEGRATION_GUIDE.md.
 */
function listFiles(dir: string): string[] {
  try {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}

export function getModelStatus(): ModelStatus {
  const imageFiles = listFiles(MODEL_PATHS.image);
  const textFiles = listFiles(MODEL_PATHS.text);

  const missing: string[] = [];
  for (const f of REQUIRED_MODEL_FILES.image) {
    if (!imageFiles.includes(f)) missing.push(`${MODEL_PATHS.image}/${f}`);
  }
  for (const f of REQUIRED_MODEL_FILES.text) {
    if (!textFiles.includes(f)) missing.push(`${MODEL_PATHS.text}/${f}`);
  }

  const imageOk = REQUIRED_MODEL_FILES.image.every((f) => imageFiles.includes(f));
  const textOk = REQUIRED_MODEL_FILES.text.every((f) => textFiles.includes(f));

  return {
    image_model_available: imageOk,
    text_model_available: textOk,
    fusion_ready: imageOk && textOk,
    image_dir: MODEL_PATHS.image,
    text_dir: MODEL_PATHS.text,
    missing,
    message: imageOk && textOk ? "Model integration configured." : MODEL_MISSING_MESSAGE,
  };
}

/**
 * Future integration point: load the image model and return a probability
 * vector aligned to DISEASE_CLASSES. Intentionally NOT implemented — it must
 * never return fabricated medical probabilities.
 */
export async function runImageModel(_imageBytes: Uint8Array): Promise<number[]> {
  throw new Error(MODEL_MISSING_MESSAGE);
}

/**
 * Future integration point: load the text model and return a probability
 * vector aligned to DISEASE_CLASSES. Intentionally NOT implemented.
 */
export async function runTextModel(_symptomText: string): Promise<number[]> {
  throw new Error(MODEL_MISSING_MESSAGE);
}
