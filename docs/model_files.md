# Model files
Expected layout:
```
backend/models/image/model.json
backend/models/image/weights.bin
backend/models/text/model.json
backend/models/text/vocab.json
```
- No model files are shipped with this repository.
- Class order is fixed by `src/lib/disease-classes.ts` (ids 0-9).
- Update `REQUIRED_MODEL_FILES` in `src/lib/prediction/config.ts` if your filenames differ.
- `/settings` shows which files are detected and which are missing.
- While files are absent, `POST /api/predict` returns 503 and the UI shows a clear notice.
