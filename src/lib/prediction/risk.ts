import { classById } from "@/lib/disease-classes";
import { FUSION_CONFIG } from "./config";
import type { FusedResult } from "./fusion";

export type RiskLevel = "low" | "moderate" | "high";

export interface StructuredSymptoms {
  itching_level?: number;
  pain_level?: number;
  redness?: boolean;
  swelling?: boolean;
  bleeding?: boolean;
  discharge?: boolean;
  spreading?: boolean;
  fever?: boolean;
}

export interface RiskAssessment {
  risk_level: RiskLevel;
  /** Human readable reasons — screening priority only, never a diagnosis. */
  reasons: string[];
  recommendation: string;
}

/**
 * Symptom-only severity score used when no model result is available and as an
 * escalation signal alongside a fused result.
 */
export function symptomSeverityScore(s: StructuredSymptoms): number {
  let score = 0;
  score += Math.min(s.itching_level ?? 0, 10) * 0.3;
  score += Math.min(s.pain_level ?? 0, 10) * 0.4;
  if (s.bleeding) score += 3;
  if (s.fever) score += 2.5;
  if (s.discharge) score += 2;
  if (s.spreading) score += 2;
  if (s.swelling) score += 1.5;
  if (s.redness) score += 0.5;
  return score;
}

/**
 * Screening-priority logic (NOT a diagnosis and NOT a severity grade):
 *  - high: predicted Melanoma or Basal Cell Carcinoma, or alarming symptoms
 *  - moderate: uncertain / low-confidence result, or moderate symptom burden
 *  - low: everything else
 */
export function assessRisk(
  fused: FusedResult | null,
  symptoms: StructuredSymptoms,
): RiskAssessment {
  const reasons: string[] = [];
  const severity = symptomSeverityScore(symptoms);
  let level: RiskLevel = "low";

  if (fused) {
    const cls = classById(fused.predicted_class_id);
    if (cls?.highPriority) {
      level = "high";
      reasons.push(`Top screening class (${cls.label}) is flagged as high priority.`);
    } else if (fused.uncertain || fused.confidence < FUSION_CONFIG.uncertainty_threshold) {
      level = "moderate";
      reasons.push("Screening result is uncertain (low fused confidence).");
    }
  } else {
    reasons.push("No model result available — priority derived from symptoms only.");
  }

  if (level !== "high") {
    if (symptoms.bleeding || symptoms.fever) {
      level = "high";
      reasons.push("Bleeding or fever reported.");
    } else if (severity >= 6) {
      level = level === "low" ? "moderate" : level;
      reasons.push("Reported symptom burden is significant.");
    }
  }

  return { risk_level: level, reasons, recommendation: recommendationFor(level) };
}

export function recommendationFor(level: RiskLevel): string {
  switch (level) {
    case "high":
      return "Priority referral: arrange an in-person dermatologist review as soon as possible.";
    case "moderate":
      return "Schedule a dermatologist review within the coming days and monitor for changes.";
    default:
      return "Routine follow-up. Keep the area clean, avoid scratching, and re-screen if it changes.";
  }
}

export const MEDICAL_DISCLAIMER =
  "This is an AI screening result, not a medical diagnosis. Please consult a qualified dermatologist for confirmation.";
