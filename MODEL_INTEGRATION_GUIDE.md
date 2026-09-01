# Model integration guide

## 1. Place the files
```
backend/models/image/model.json
backend/models/image/weights.bin
backend/models/text/model.json
backend/models/text/vocab.json
```
Names are declared in `REQUIRED_MODEL_FILES` (`src/lib/prediction/config.ts`). Change them there if your artefacts differ.

## 2. Implement the stubs
In `src/lib/prediction/model-loader.server.ts`:
- `runImageModel(imageBytes)` → probability vector of length 10
- `runTextModel(symptomText, structuredSymptoms)` → probability vector of length 10

Both vectors MUST be aligned to `DISEASE_CLASSES` indices. Never reorder that list.

## 3. Fusion
`fusePredictions(imageProbs, textProbs)` performs weighted late fusion using
`FUSION_CONFIG` (image 0.45, text 0.55) and flags results below the uncertainty threshold (0.55).

## 4. Risk layer
`assessRisk(symptoms, fusedResult)` returns `risk_level` + reasons + recommendation.
Melanoma and BCC are high priority; bleeding or fever escalate; low confidence → moderate.
This is screening priority, not severity.

## 5. Endpoint
`src/routes/api/predict.ts` already validates input and returns 503 when files are missing.
Once the stubs return real vectors, remove nothing else — the response shape
(`predicted_class`, `confidence`, `top3`, `risk_level`, `recommendation`) is what the UI stores.

## 6. Verify
Open `/settings` — image model, text model and fusion should read available/yes.
