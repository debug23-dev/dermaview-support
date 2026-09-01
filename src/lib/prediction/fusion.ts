import { DISEASE_CLASSES, NUM_CLASSES, classById } from "@/lib/disease-classes";
import { FUSION_CONFIG } from "./config";

export type ProbabilityVector = number[];

export interface TopPrediction {
  class_id: number;
  label: string;
  probability: number;
}

export interface FusedResult {
  predicted_class_id: number;
  predicted_class: string;
  confidence: number;
  top3: TopPrediction[];
  uncertain: boolean;
  fused_probs: ProbabilityVector;
}

function normalise(vec: ProbabilityVector): ProbabilityVector {
  const sum = vec.reduce((a, b) => a + b, 0);
  if (sum <= 0) return vec.map(() => 1 / vec.length);
  return vec.map((v) => v / sum);
}

/**
 * Weighted late fusion of an image probability vector and a text probability
 * vector. Both vectors MUST be aligned to DISEASE_CLASSES indices.
 *
 * This function is pure maths — it contains no model logic and is safe to unit
 * test once the real models produce probability vectors.
 */
export function fusePredictions(
  imageProbs: ProbabilityVector,
  textProbs: ProbabilityVector,
  weights: { image_weight: number; text_weight: number } = FUSION_CONFIG,
): FusedResult {
  if (imageProbs.length !== NUM_CLASSES || textProbs.length !== NUM_CLASSES) {
    throw new Error(`Probability vectors must have length ${NUM_CLASSES}`);
  }

  const img = normalise(imageProbs);
  const txt = normalise(textProbs);
  const wSum = weights.image_weight + weights.text_weight || 1;

  const fused = normalise(
    img.map((p, i) => (p * weights.image_weight + txt[i]! * weights.text_weight) / wSum),
  );

  const ranked = fused
    .map((probability, class_id) => ({
      class_id,
      label: classById(class_id)?.label ?? `Class ${class_id}`,
      probability,
    }))
    .sort((a, b) => b.probability - a.probability);

  const best = ranked[0]!;

  return {
    predicted_class_id: best.class_id,
    predicted_class: best.label,
    confidence: best.probability,
    top3: ranked.slice(0, 3),
    uncertain: best.probability < FUSION_CONFIG.uncertainty_threshold,
    fused_probs: fused,
  };
}

export const ALL_CLASS_LABELS = DISEASE_CLASSES.map((c) => c.label);
