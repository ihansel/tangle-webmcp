# Tangle WebMCP architecture note

## Upstream baseline

- Repository: <https://github.com/TangleML/tangle-ui>
- Branch inspected: `master`
- Commit: `d7768e85d515ac824adec6dabd1f3f7f88f1cf2e`
- Commit date: 2026-09-01
- Licence: Apache-2.0 (preserved in the repository root)

The `webmcp-hackathon` branch starts directly from that commit. Files under
`src/webmcp/`, the browser runner, the equipment-failure fixture, and this note
are hackathon additions.

## Existing APIs reused

Tangle UI v2 already has the right shared-state boundary. `ComponentSpec` is the
authoritative MobX Keystone graph model and the React Flow canvas derives its
nodes and edges from that model. There is no separate WebMCP graph.

The existing embedded assistant exposes a main-thread `ToolBridgeApi`. Its
editor implementation is split into narrow handlers:

- `createCsomBridgeHandlers` reads and mutates the live `ComponentSpec`.
- `serializeSpecForAi` produces a compact, stable graph projection.
- editor actions such as `addTask` and `connectNodes` preserve normal graph
  behaviour.
- `UndoStore.withGroup` records mutations in the same undo history used by the
  human UI.
- `validateSpec` is the editor's normal topology and component validator.

The WebMCP adapter wraps those APIs rather than exporting `ToolBridgeApi`
directly. This prevents arbitrary component references, backend submission,
container execution, raw pipeline serialization, and full dataset transfer
from becoming public browser tools.

## Public WebMCP boundary

The adapter registers ten intention-level tools against
`document.modelContext` when the browser supports WebMCP:

1. `get_pipeline_summary`
2. `search_components`
3. `add_pipeline_tasks`
4. `configure_task`
5. `connect_tasks`
6. `validate_pipeline`
7. `run_browser_pipeline`
8. `get_run_summary`
9. `inspect_model_metrics`
10. `undo_pipeline_change`

Only stable curated component IDs cross this boundary. Inputs are bounded,
validated again in application code, and result payloads contain summaries and
metrics rather than datasets. Batched additions and connections run inside one
labelled undo group, so a person can reverse an entire agent-authored change in
one normal editor action.

## Browser execution

Curated component references carry a `webmcp://components/<id>` URL and an
explicit `browser.webmcp.dev/executable` annotation. The runner rejects every
other component before execution.

The worker executes four browser-native workload families:

- classification: `Load CSV -> Select columns -> Fill missing values -> Encode
categories -> Train/test split -> Logistic regression + Decision tree ->
Evaluate -> Compare`;
- clustering: customer features -> K-means -> bounded segment profile; and
- embeddings: product catalogue -> deterministic TF-IDF or browser-trained
  Product2Vec -> nearest-neighbour report; and
- forecasting: daily sales -> history-only and driver-aware forecasts ->
  held-out error comparison.

Training and analysis are deterministic, bounded, cancellable by terminating the
worker, and keep the CSV and derived arrays in the browser. An agent-triggered
run is blocked until the person authorises the next local run in the visible
panel. The tool-facing summaries return metrics and concise insights rather than
dataset rows.

## Bounded hosted buyer profiles

The buyer-profile recipe is intentionally marked as hosted. Tangle still builds
the visible graph and a Web Worker still owns progress, cancellation, and result
shaping, but the `generate-buyer-profiles` node calls a same-origin Sites Worker
route. That route accepts only eight fixed synthetic customer IDs, reconstructs
their inputs from the bundled dataset, authenticates to Modal with server-side
proxy credentials, and caches each result. Public clients cannot start training
or submit arbitrary customer data.

The offline Modal job uses a Qwen3.5-4B teacher to rewrite grounded synthetic
targets, fine-tunes a Qwen3.5-0.8B LoRA adapter with a 30-minute H100 timeout,
and evaluates held-out JSON validity, exact structured labels, evidence
grounding, and difficult customer slices. The public inference class scales to
zero and permits at most one container. An agent-triggered hosted run uses the
same one-time visible approval control as a local run.

The separate fine-tuning workflow on the dashboard is an honest replay of that
completed run. Its teacher, training, evaluation, and deployment nodes expose
the shape and measured artifacts of the experiment, while the final inference
node calls the protected endpoint. Opening or running this public workflow does
not create a Modal GPU job or incur a new training run.

For a user-owned run, Modal API credentials (`MODAL_TOKEN_ID` and
`MODAL_TOKEN_SECRET`) must be available only to a trusted local or server
runtime that invokes the deployed Modal functions. They are distinct from the
restricted proxy token used to call the HTTPS inference endpoint. Neither kind
of credential belongs in browser storage, a pipeline argument, WebMCP tool
output, or a `VITE_` environment variable.
