# Deployment
- Publish from Lovable; the backend (database, auth, private storage) deploys with the app.
- Confirm auth email confirmation settings before onboarding real staff.
- Storage bucket `lesion-images` is private with a 10MB per-file limit; images are only reachable through signed URLs.
- Model files are local artefacts and are not committed. Ship them to the runtime that serves `/api/predict`.
- After deploying, verify `/settings` model status and create one test case end to end.
