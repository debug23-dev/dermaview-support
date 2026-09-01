/**
 * Multimodal prediction configuration.
 *
 * These values are the single source of truth for the future
 * image + text + fusion pipeline. Nothing here performs inference.
 */

export const FUSION_CONFIG = {
  image_weight: 0.45,
  text_weight: 0.55,
  /** Below this fused confidence the case is treated as uncertain. */
  uncertainty_threshold: 0.55,
} as const;

export const MODEL_PATHS = {
  /** Directory where the user must place image model files. */
  image: "backend/models/image",
  /** Directory where the user must place text model files. */
  text: "backend/models/text",
} as const;

/**
 * File names the future loaders will look for. Extend as needed when the real
 * models are added — the presence check uses these as required artefacts.
 */
export const REQUIRED_MODEL_FILES = {
  image: ["model.json", "weights.bin"],
  text: ["model.json", "vocab.json"],
} as const;

export const MODEL_MISSING_MESSAGE =
  "Model files are missing. Please place the required model files in backend/models/.";

export type ModelStatus = {
  image_model_available: boolean;
  text_model_available: boolean;
  fusion_ready: boolean;
  image_dir: string;
  text_dir: string;
  missing: string[];
  message: string;
};
