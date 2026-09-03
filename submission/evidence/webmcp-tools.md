# WebMCP tool evidence

## Registration

**VERIFIED in the deployed editor on 4 September 2026.** The page registered ten
tools through the real browser API. The in-app Browser's WebMCP capability
returned the same names, descriptions, schemas, annotations, origin, and page
URL as the source definitions. The visible panel reported “10 tools shared.”

The source registration is at `src/webmcp/useWebMcp.ts:28-78`; the actual
`document.modelContext.registerTool` call is at line 50.

## Inventory

| Tool                    | User-facing purpose                                                  | Input schema (summary)                                                        | Return shape                                                                                                                          | Side effects                                                                             | Source                                                                                 | Tested status                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_pipeline_summary`  | Inspect the open graph before/after edits.                           | Strict empty object.                                                          | Pipeline name; bounded tasks with stable IDs, component IDs, configured argument names, browser capability; binding count; undo flag. | None.                                                                                    | `toolDefinitions.ts:53-62`; adapter summary near `WebMcpAdapter.ts:183`.               | **PARTIALLY VERIFIED** — live success; deployed build ignored an extra field. Local strict guard added/tested.                                                                                                                                                               |
| `search_components`     | Find curated browser-safe components and ports.                      | Optional query ≤120 chars; integer limit 1–16; no extras.                     | Count and bounded component metadata/ports.                                                                                           | None.                                                                                    | `toolDefinitions.ts:64-83`; `WebMcpAdapter.ts:207-231`.                                | **VERIFIED** — embedding search returned 3; no-match returned 0; limit 0 rejected.                                                                                                                                                                                           |
| `add_pipeline_tasks`    | Add a bounded task batch, optionally connected, as one undo group.   | 1–16 curated tasks; 0–24 connections; stable client IDs; literal config only. | Success, created task mappings, connection count, undo label.                                                                         | Adds visible tasks/connections and one normal undo group.                                | `toolDefinitions.ts:85-156`; `WebMcpAdapter.ts:232-323`.                               | **VERIFIED** — added two visible temporary tasks; empty batch rejected; arbitrary component rejection covered by unit test; tasks later removed by undo.                                                                                                                     |
| `configure_task`        | Set one literal input on a visible task.                             | Task ID, input name, string/number/boolean value; bounded strings; no extras. | `{success}` or bounded task-input error.                                                                                              | Changes a visible task argument; undoable.                                               | `toolDefinitions.ts:158-175`; `WebMcpAdapter.ts:325-338`.                              | **VERIFIED** — Product2Vec epochs changed; nonexistent input returned a safe error; missing value rejected.                                                                                                                                                                  |
| `connect_tasks`         | Connect existing task ports as a bounded undo group.                 | 1–24 source/target task IDs and ports; no extras.                             | Overall success and per-connection success list.                                                                                      | Adds visible graph bindings; undoable.                                                   | `toolDefinitions.ts:177-210`; `WebMcpAdapter.ts:340-386`.                              | **VERIFIED** — temporary loader→selector connection succeeded; empty list and bad port rejected; connection undone.                                                                                                                                                          |
| `validate_pipeline`     | Report editor validity separately from browser executability.        | Strict empty object.                                                          | Editor validity/issues; browser-executable flag and bounded issues.                                                                   | None.                                                                                    | `toolDefinitions.ts:212-221`; `WebMcpAdapter.ts:388-429`.                              | **PARTIALLY VERIFIED** — valid Product2Vec graph returned no issues; deployed build ignored an extra field. Local strict guard added/tested.                                                                                                                                 |
| `run_browser_pipeline`  | Run a validated curated workload locally after one visible approval. | Strict empty object.                                                          | Classification, clustering, or embedding run result.                                                                                  | Consumes one-run permission; creates/terminates a Worker; updates visible status/result. | `toolDefinitions.ts:223-232`; `WebMcpAdapter.ts:447-455`; `BrowserRunStore.ts:38-122`. | **PARTIALLY VERIFIED** — live success for all three workload families; permission refusal, 404 failure, and recovery verified. Detailed return is useful but larger than ideal. Deployed extra-field handling relies on permission, not strict rejection; local guard added. |
| `get_run_summary`       | Read concise current/latest result without source rows.              | Strict empty object.                                                          | Idle/failed state or bounded run metadata and result-specific insights.                                                               | None.                                                                                    | `toolDefinitions.ts:234-243`; `WebMcpAdapter.ts:457-502`.                              | **PARTIALLY VERIFIED** — idle, failed, classification, clustering, and embedding states verified; deployed build ignored an extra field. Local guard added/tested.                                                                                                           |
| `inspect_model_metrics` | Compare bounded classifier metrics.                                  | Optional task ID ≤100 chars; no extras.                                       | Run ID, priority metric, models with accuracy/precision/recall/F1/confusion matrix.                                                   | None.                                                                                    | `toolDefinitions.ts:245-259`; `WebMcpAdapter.ts:504-534`.                              | **VERIFIED** — both churn models returned; unknown and non-string task IDs rejected; clustering/embedding produced a clear wrong-kind error.                                                                                                                                 |
| `undo_pipeline_change`  | Undo the most recent normal Tangle graph change.                     | Strict empty object.                                                          | Success, remaining levels, updated summary; or a safe empty-undo error.                                                               | Reverses one normal undo level.                                                          | `toolDefinitions.ts:261-270`; `WebMcpAdapter.ts:536-545`.                              | **PARTIALLY VERIFIED** — live undo of configure/connect/add cleanup succeeded; empty state unit-tested. Deployed build accepted an extra field and performed the undo; local strict guard now prevents this.                                                                 |

Line numbers reflect the local reviewed tree after the strict-input fix.

## Live execution evidence

### Product2Vec

- Pipeline summary: 3 tasks, 2 bindings, all browser-executable.
- Run ID: `browser-mtllwadc`
- 160 rows, 16 dimensions, 80 epochs, 656 training pairs, 71 ms.
- Initial/final loss: 0.693145 / 0.324299.
- Context/random similarity: 0.949179 / 0.039626.
- Strongest learned pair: SKU-0071 ↔ SKU-0074, cosine similarity 0.997392.
- `inspect_model_metrics` correctly rejected the embedding result and directed
  the agent to `get_run_summary`.

### Churn classifiers

- Run ID: `browser-mtllz8g0`
- 1,800 rows, 1,350 train, 450 test, deterministic seed 42, 357 ms.
- Logistic regression: accuracy 0.8267, precision 0.7168, recall 0.6378,
  F1 0.6750.
- Decision tree: accuracy 0.8000, precision 0.6555, recall 0.6142,
  F1 0.6341.
- Preferred: logistic regression because recall was higher.

### Customer clustering

- Run ID: `browser-mtlm0lks`
- 1,800 rows, 4 clusters, silhouette 0.3639, seed 42, 20 ms.
- Largest segment: Frequent regulars, 525 customers (29%).

### Permission and recovery

- A Product2Vec run without approval returned: “User confirmation required:
  choose Allow next agent run in the visible browser-runner panel.”
- A deliberately missing same-origin dataset returned a bounded 404 message in
  the tool and visible panel.
- One undo restored the dataset path; the next approved run completed in 72 ms
  with run ID `browser-mtlm3p61`.

## Privacy/safety assessment

- Schemas bound task/connection counts, string lengths, component IDs, and
  literal values.
- The adapter validates typed inputs again with Zod.
- The worker loads same-origin CSV data and does not send rows through WebMCP.
- Result summaries expose metrics and small examples, not raw CSV rows.
- Errors observed contained validation detail but no credential, stack trace,
  filesystem path, or source record.
- The full `run_browser_pipeline` Product2Vec return includes extensive derived
  points/products. It is not raw input data, but it is large; a future version
  should return the same concise shape as `get_run_summary` and leave detailed
  report data inside the page.
