# User workflow
1. **Assistant** registers the patient (demographics, history, medication, allergies).
2. **Assistant** creates a screening case: lesion photo, affected area, duration, itching/pain 0-10, sign checkboxes, free-text description.
3. The app stores the case with a screening priority and sets status `pending_review`.
4. **Doctor** opens the case: photo, symptoms, outcome, and (doctor/admin only) confidence and top-3 alternatives.
5. **Doctor** records notes and sets status to reviewed, referred or closed.
6. Dashboard tracks totals, pending reviews, priority counts and condition summary.

Every screen carries the disclaimer: an AI screening result is not a diagnosis.
