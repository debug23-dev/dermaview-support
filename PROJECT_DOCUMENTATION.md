# Project documentation

## Purpose
Support clinics in triaging skin lesions and routing cases to doctors. It is a screening aid, not a diagnostic device.

## Roles
| Role | Sees |
| --- | --- |
| admin | everything, incl. model confidence and top-3 |
| doctor | clinical detail, review decisions |
| assistant | intake, final outcome and recommendation only (no confidence, no top-3) |

## Data model
- `profiles` — one row per user (id, email, full_name)
- `user_roles` — separate role table (`app_role`), read by `has_role()` / `is_staff()` security-definer functions
- `patients` — patient_code, demographics, medical history, medication, allergies
- `screening_cases` — patient_id, affected_area, duration, symptom flags + itching/pain 0-10,
  image_path, predicted_class, confidence, top3_predictions_json, risk_level, recommendation,
  status (`pending_review` / `reviewed` / `referred` / `closed`), doctor_notes, reviewed_by

RLS: staff-only access via `is_staff()`, deletes restricted to admins. Lesion images live in the
private `lesion-images` bucket and are served through short-lived signed URLs.

## Prediction structure (no models shipped)
- `src/lib/disease-classes.ts` — fixed 10-class list; index = model class id
- `src/lib/prediction/config.ts` — fusion weights (image 0.45 / text 0.55), uncertainty threshold, required files
- `src/lib/prediction/fusion.ts` — pure weighted late fusion → predicted class, confidence, top-3, uncertainty
- `src/lib/prediction/risk.ts` — screening priority from symptoms + optional fused result, plus the disclaimer text
- `src/lib/prediction/model-loader.server.ts` — file discovery and inference stubs
- `src/routes/api/predict.ts` — validated endpoint; 503 while models are missing

## Routes
`/login`, `/register`, `/dashboard`, `/patients`, `/patients/new`, `/patients/$id`,
`/screening/new`, `/screening/$id`, `/settings`.
