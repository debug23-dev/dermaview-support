# API documentation

## POST /api/predict
`multipart/form-data`

| Field | Type | Required |
| --- | --- | --- |
| patient_id | uuid | yes |
| image | file (jpeg/png/webp, ≤10MB) | yes |
| symptom_text | string ≤4000 | no |
| symptoms | JSON string (itching_level, pain_level 0-10; redness, swelling, bleeding, discharge, spreading, fever booleans) | no |

**200**
```json
{ "predicted_class": "Eczema", "predicted_class_id": 0, "confidence": 0.71,
  "top3": [{ "class_id": 0, "label": "Eczema", "probability": 0.71 }],
  "risk_level": "moderate", "recommendation": "…", "disclaimer": "…" }
```
**400** invalid input · **503** model files missing (never a fabricated prediction)

## Server function: fetchModelStatus
Returns `{ image_model_available, text_model_available, fusion_ready, image_dir, text_dir, missing, message }`.
Used by `/settings`.

## Database access
All patient and case reads/writes go through the Cloud client with RLS: staff-only select/insert/update,
admin-only delete. Lesion images are fetched with 1-hour signed URLs.
