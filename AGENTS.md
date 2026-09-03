# Tangle WebMCP project instructions

## Mission

Turn Tangle's visual machine-learning pipeline editor into an interoperable, agent-collaborative browser application. A WebMCP-capable agent should be able to inspect and modify the same visible pipeline as the user, validate it, execute a curated browser-native subset, and interpret the resulting metrics.

The goal is not to rebuild Tangle or expose every internal operation. Reuse its existing editor, state model, undo system, component descriptions, and agent ToolBridge wherever practical.

## Upstream and attribution

The primary upstream frontend is `https://github.com/TangleML/tangle-ui` and is Apache-2.0 licensed. The backend is `https://github.com/TangleML/tangle`. Before changing code, record the exact upstream revision used and preserve its notices. Clearly distinguish upstream functionality from hackathon additions.

Prefer a maintainable fork or a narrowly scoped integration over copying large amounts of Tangle into an unrelated application.

## MVP scope

The MVP should support a curated browser-executable pipeline such as:

`Load CSV -> Select columns -> Fill missing values -> Encode categories -> Train/test split -> Train model -> Evaluate -> Visualise`

Support a small set of dependable classical ML components first, such as logistic regression, linear regression, a small decision tree, and straightforward metrics. Use a lightweight JavaScript ML implementation in a Web Worker. TensorFlow.js may be added for a specific justified component. Pyodide is optional and must not become a prerequisite for the core demonstration.

Do not execute arbitrary Python, arbitrary component YAML, shell commands, containers, or untrusted user code in the browser MVP.

## Hero journey

Use a compact equipment-failure dataset. The user asks the agent to prepare missing values, compare two suitable classifiers, focus on recall because missed failures are costly, run the pipeline locally, and explain the preferred model. The agent builds and configures a visible graph; the user can inspect, change, and undo it; the browser runner produces metrics and visualizations that both can discuss.

## WebMCP design

Tangle already has an embedded AI assistant. The hackathon contribution must therefore emphasize open browser-agent interoperability: the user can bring a WebMCP-capable agent without relying on Tangle's app-specific chat, provider, or API key.

Reuse the existing ToolBridge and live pipeline state where possible, but expose a compact public surface rather than mirroring every internal tool. Likely tools include:

- `get_pipeline_summary`
- `search_components`
- `add_pipeline_tasks`
- `configure_task`
- `connect_tasks`
- `validate_pipeline`
- `run_browser_pipeline`
- `get_run_summary`
- `inspect_model_metrics`
- `undo_pipeline_change`

Prefer batched, intention-level mutations. Avoid sending the complete pipeline document when a summary and stable task IDs suffice. Agent changes must appear immediately in the graph and participate in normal undo/redo history.

## Privacy and safety

- Keep imported data and browser-runner inputs local by default.
- Do not send complete datasets through WebMCP tool arguments or results.
- Separate read-only inspection, reversible pipeline edits, and execution actions.
- Require explicit user control before a potentially expensive run or any future backend submission.
- Bound dataset size, component count, training duration, worker memory, logs, and tool output.
- Validate component compatibility and pipeline topology before execution.
- Never claim that browser execution supports all Tangle component languages.

## Engineering expectations

- First inspect the latest upstream implementation and its internal agent bridge before designing new abstractions.
- Keep the WebMCP adapter thin and testable.
- Introduce a clear execution-capability marker so unsupported components are visible before a run.
- Run browser ML in a worker and provide progress, cancellation, deterministic seeds where available, and recoverable failures.
- Test graph mutations, undo grouping, validation, serialization boundaries, runtime components, metrics, and the complete WebMCP flow.
- Preserve unrelated upstream behavior and user changes.

## Hackathon delivery

The finished project needs a live application, public repository with license and attribution, a clear account of post-start work, a concise description of why WebMCP is necessary, and a public demonstration video under three minutes with audio.

The shared research is in `../knowledge/`, especially:

- `../knowledge/concepts/hackathon-brief.md`
- `../knowledge/concepts/webmcp-technical-primer.md`
- `../knowledge/decisions/project-guardrails.md`

## Definition of done

The project is done when a WebMCP-capable agent can build and configure a visible supported pipeline, the user can inspect and undo its edits, the pipeline runs locally on a real dataset, and the agent can retrieve bounded metrics and explain the result without raw data leaving the page.
