/**
 * Canonical disease class list for DermaCare AI.
 *
 * The index of each entry is the class id used by the future image model,
 * text model and fusion layer. Never reorder this list — model outputs are
 * aligned to these indices.
 */

export interface DiseaseClass {
  id: number;
  key: string;
  /** Clinical label — shown to doctors/admins. */
  label: string;
  /** Plain-language label — safe to show to patients/assistants. */
  patientLabel: string;
  /** Classes flagged as high screening priority by the risk layer. */
  highPriority: boolean;
}

export const DISEASE_CLASSES: DiseaseClass[] = [
  {
    id: 0,
    key: "eczema",
    label: "Eczema",
    patientLabel: "Eczema-like skin inflammation",
    highPriority: false,
  },
  {
    id: 1,
    key: "melanoma",
    label: "Melanoma",
    patientLabel: "A mole-type lesion that needs urgent specialist review",
    highPriority: true,
  },
  {
    id: 2,
    key: "atopic_dermatitis",
    label: "Atopic Dermatitis",
    patientLabel: "Atopic dermatitis-like skin inflammation",
    highPriority: false,
  },
  {
    id: 3,
    key: "bcc",
    label: "Basal Cell Carcinoma (BCC)",
    patientLabel: "A skin growth that needs urgent specialist review",
    highPriority: true,
  },
  {
    id: 4,
    key: "nv",
    label: "Melanocytic Nevi (NV)",
    patientLabel: "A common mole-type lesion",
    highPriority: false,
  },
  {
    id: 5,
    key: "bkl",
    label: "Benign Keratosis-like Lesions (BKL)",
    patientLabel: "A benign-looking keratosis-type lesion",
    highPriority: false,
  },
  {
    id: 6,
    key: "psoriasis_lichen_planus",
    label: "Psoriasis / Lichen Planus",
    patientLabel: "Psoriasis or lichen planus-like scaly skin condition",
    highPriority: false,
  },
  {
    id: 7,
    key: "seborrheic_keratoses",
    label: "Seborrheic Keratoses / Benign Tumors",
    patientLabel: "A benign-looking skin growth",
    highPriority: false,
  },
  {
    id: 8,
    key: "tinea_candidiasis",
    label: "Tinea / Ringworm / Candidiasis",
    patientLabel: "A possible fungal skin infection",
    highPriority: false,
  },
  {
    id: 9,
    key: "warts_viral",
    label: "Warts / Molluscum / Viral Infections",
    patientLabel: "A possible viral skin infection",
    highPriority: false,
  },
];

export const NUM_CLASSES = DISEASE_CLASSES.length;

export function classById(id: number): DiseaseClass | undefined {
  return DISEASE_CLASSES.find((c) => c.id === id);
}

export function classByLabel(label: string | null | undefined): DiseaseClass | undefined {
  if (!label) return undefined;
  return DISEASE_CLASSES.find((c) => c.label === label || c.key === label);
}
