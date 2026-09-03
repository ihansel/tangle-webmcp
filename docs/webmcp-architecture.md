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

The MVP worker executes only the equipment-failure classification path:

`Load CSV -> Select columns -> Fill missing values -> Encode categories -> Train/test split -> Logistic regression + Decision tree -> Evaluate -> Compare`

Training is deterministic, bounded, cancellable by terminating the worker, and
keeps the CSV and derived arrays in the browser. An agent-triggered run is
blocked until the person authorises the next local run in the visible panel.
