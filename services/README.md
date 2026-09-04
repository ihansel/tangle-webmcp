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

Modal's CLI and SDK read a user-owned API token from the active
`~/.modal.toml` profile or from `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET`.
Those credentials can deploy or invoke functions and must stay in the trusted
local or server process that owns the workflow. Do not expose them through a
`VITE_` variable, browser storage, pipeline configuration, or WebMCP output.

The HTTPS inference endpoint uses a separate Modal proxy token. Tangle's Sites
Worker stores its `Modal-Key` and `Modal-Secret` as server-side secrets and only
allows the fixed public demo customer IDs through. A proxy token can call the
protected endpoint but cannot be used as the API token that deploys the app.

The public fine-tuning workflow replays the measured reference run and invokes
only the protected sample endpoint. It cannot launch training. A real
user-owned training button would require an authenticated server-side control
plane, per-user secret storage, cost limits, job status, cancellation, and
auditing; exported keys in browser JavaScript are not a safe substitute.
