# Research notes
- **Multimodal design**: image CNN + text/symptom classifier combined by weighted late fusion
  (image 0.45, text 0.55). Text is weighted higher because clinic symptom reports are more
  consistent than phone photos taken under variable lighting.
- **Uncertainty**: fused confidence below 0.55 marks the case uncertain and raises priority to moderate.
- **Priority ≠ severity**: melanoma and BCC classes, bleeding or fever, and high symptom burden raise
  priority so a human reviews sooner. No severity grade is claimed.
- **Safety**: the system refuses to output a prediction without real models, keeps confidence and
  alternative classes away from assistants, and shows the disclaimer on every clinical screen.
- **Future work**: calibration on local clinic data, per-class thresholds, inter-rater agreement study
  against dermatologist labels, and follow-up outcome capture for feedback training.
