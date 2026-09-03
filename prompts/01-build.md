# Kickoff prompt: build Tangle WebMCP

Work in this Tangle WebMCP project and follow its `AGENTS.md` completely.

Build a hackathon-ready fork or integration of the current Tangle UI that exposes its live visual pipeline through WebMCP and adds a curated browser-native classical ML runner. Do not rebuild the visual editor from scratch.

Start by inspecting the latest `TangleML/tangle-ui` source, its license, its current pipeline state model, undo/redo behavior, component catalogue, embedded agent ToolBridge, and run tooling. Record the upstream commit used and produce a short architecture note identifying exactly which existing bridge and state APIs can be reused. Then establish the project locally without erasing upstream history or notices.

Implement the narrow hero journey from `AGENTS.md`: load a small equipment-failure CSV locally; build visible preprocessing steps; compare logistic regression with a small decision tree or another supported classifier; evaluate with emphasis on recall; show metrics; and explain the selection. The user must be able to see, manually adjust, and undo every agent-created graph change.

Create a small public WebMCP adapter over Tangle's existing live state. Use stable task and component identifiers, bounded summaries, batched mutations, schema validation, and normal undo grouping. Do not expose arbitrary internal methods, raw pipeline internals, full datasets, arbitrary code execution, or backend submission in the MVP.

Add an explicit browser-runner capability model and only mark the curated components as executable. Run training in a worker with deterministic seeds, progress, cancellation, input limits, and useful errors. Keep data in the browser. Pyodide may be explored only after the dependable JavaScript path works and must remain outside the critical demo path.

Verify the complete story in a WebMCP-capable browser, including tool discovery, visible graph updates, undo, validation, execution, bounded metric retrieval, and manual refinement after an agent action. Add focused automated tests and a repeatable end-to-end fixture.

Finish with deployment, attribution and licensing documentation, a concise description of the hackathon contribution, and an under-three-minute demo script. Prioritize a complete, reliable vertical slice over broad component coverage.
