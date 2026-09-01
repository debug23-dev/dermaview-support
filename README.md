# DermaCare AI

Skin disease screening and doctor-review support system for clinics.

- Staff auth (admin / doctor / assistant) with role-based visibility
- Patient register with medical background
- Screening cases: lesion photo + structured symptoms + notes
- Screening-priority (low / moderate / high) and doctor review workflow
- Multimodal prediction structure ready for a future image model + text model + late fusion

**Predictions are disabled until real model files are installed.** The app never fabricates results;
`POST /api/predict` returns HTTP 503 while model files are missing.

## Stack
React + TanStack Start, Tailwind + shadcn/ui, Lovable Cloud (Postgres, auth, private storage).

## Quick start
1. Register a staff account at `/register` (choose admin to see clinical detail).
2. Add a patient, then create a screening case.
3. Check `/settings` for model file status.

## Docs
- `PROJECT_DOCUMENTATION.md` — architecture and data model
- `MODEL_INTEGRATION_GUIDE.md` — how to plug in the real models
- `API_DOCUMENTATION.md` — endpoints
- `docs/setup.md`, `docs/model_files.md`, `docs/deployment.md`, `docs/user_workflow.md`, `docs/research_notes.md`

## Medical disclaimer
This is an AI screening result, not a medical diagnosis. Please consult a qualified dermatologist for confirmation.
