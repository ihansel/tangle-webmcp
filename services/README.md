# Buyer profile model service

This directory contains the Modal backend used by the public Tangle WebMCP
buyer-profile demo. It is deliberately separate from the browser-native models:
the UI must obtain explicit approval before synthetic customer rows are sent to
the hosted endpoint.

The capped reference run uses a Qwen3.5-4B teacher to rewrite 960 structured
synthetic examples, then fine-tunes a Qwen3.5-0.8B LoRA adapter for at most 300
steps on one H100. The defaults are calibrated from a smoke run to finish in
about 30 minutes end to end. Held-out evaluation covers schema validity, exact
structured labels, grounded evidence, and important customer slices.

The reference run completed on 4 September 2026. Teacher-data generation took
9.79 minutes and the 300-step H100 fine-tune took 9.44 minutes. Across 80
held-out customers, the adapter produced 100% valid structured profiles, 93.5%
exact label accuracy, 100% grounded evidence, and a combined score of 96.8/100.
The untouched 0.8B base model scored 0 because it did not satisfy the required
structured profile contract. The run ID is `modal-1788485378` and the adapter
version is `2026.09.04-0129`.

Run the experiment and deploy the authenticated inference endpoint:

```bash
uvx --from modal modal run services/modal_buyer_profile_lab.py
uvx --from modal modal deploy services/modal_buyer_profile_lab.py
```

The endpoint requires a Modal proxy token. Tangle's Sites Worker stores that
token server-side and only allows the fixed public demo customer IDs through.
