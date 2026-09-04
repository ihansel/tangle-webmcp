# Project facts

## Identity

- **Project name:** Strand
- **Positioning:** An independent WebMCP experiment built on Tangle; not an
  official TangleML release.
- **Base product:** Tangle UI, an open-source visual machine-learning pipeline
  editor.
- **Intended users:** analysts, ML practitioners, commerce teams, and people who
  want an agent to help assemble and interpret a pipeline without surrendering
  visibility or control.
- **Status:** functional beta with a public Sites deployment and public source
  repository.

## Provenance

- Upstream repository: <https://github.com/TangleML/tangle-ui>
- Upstream baseline: `d7768e85d515ac824adec6dabd1f3f7f88f1cf2e`,
  dated 1 September 2026.
- Hackathon branch: `webmcp-hackathon`
- Latest committed hackathon revision inspected:
  `c13d2cb4`, dated 3 September 2026.
- License: Apache License 2.0, preserved as `LICENSE`.
- Upstream attribution: `UPSTREAM.md`.
- Public hackathon repository: **not identified**. The configured GitHub remote
  is the upstream repository, and it has no `webmcp-hackathon` branch.

Whether all ten hackathon commits fall inside the official submission period
cannot be established without the event's start and end dates.

## Purpose and journey

The person opens a prepared Tangle graph or asks an agent to assemble one. The
agent discovers ten page-defined WebMCP tools, inspects the graph, searches the
curated browser-safe component catalogue, adds/configures/connects tasks, and
validates the pipeline. The person sees those changes on the same canvas, may
undo them, and must explicitly allow the next agent-triggered run. A Worker then
loads a same-origin CSV and executes a bounded classifier, clustering, or
embedding workflow. The UI and the agent can inspect the resulting metrics and
reports without returning source rows.

## What a person can do

- Open equipment-failure, churn, customer-segmentation, and SKU-embedding recipes.
- Inspect and edit the visible pipeline graph.
- Change task arguments and connections through Tangle's existing editor.
- allow one agent-triggered run or run locally from the visible runner panel;
- undo and redo normal graph changes;
- review model, segment, embedding, and operational reports.

## What an agent can do through WebMCP

- inspect a bounded pipeline summary;
- search 14 curated browser-executable components;
- add and connect up to 16 tasks/24 connections per bounded request;
- set literal task arguments;
- validate editor topology and browser compatibility;
- request a permission-gated local run;
- read bounded run summaries and classifier metrics; and
- undo the most recent normal Tangle graph change.

## What becomes possible together

The agent handles multi-step graph assembly and structured analysis while the
person retains the visual mental model, one-run execution control, normal undo,
and final judgment. This supports a concrete collaboration loop: agent proposes
and builds; person reviews and authorizes; browser computes; agent and person
interpret the same evidence.

## Why WebMCP matters

Coordinate automation would have to find nodes visually, scrape labels, guess
ports, and infer whether a click changed the right graph. WebMCP exposes stable
names, JSON schemas, task IDs, port names, typed results, and explicit errors
from the page itself. It is materially more reliable for compound graph edits
and safer because the public surface is limited to curated components, bounded
payloads, normal undo, and an explicit run permission.

## Implementation

The React editor calls `useWebMcp`, which creates a thin adapter over Tangle's
live `ComponentSpec` and registers ten tools with
`document.modelContext.registerTool`. The adapter reuses Tangle's task,
connection, validation, serialization, and undo APIs. Browser execution creates
an ES-module Web Worker; the Worker fetches only the configured same-origin CSV
and calls a deterministic TypeScript engine with row/column and training bounds.

## Verified workloads

- **Churn classification:** 1,800 rows; 1,350 train/450 test; 357 ms. Logistic
  regression recall 0.6378 versus decision-tree recall 0.6142.
- **Customer clustering:** 1,800 rows; 4 clusters; silhouette 0.3639; 20 ms.
- **Product2Vec:** 160 products; 16 dimensions; 80 epochs; 656 context pairs;
  loss 0.693145 to 0.324299; context similarity 0.949179 versus 0.039626 random
  baseline; 71 ms.

These figures were produced in the authenticated hosted app on 4 September 2026.
They are deterministic for the included data and seed but should still be
treated as demo results, not general performance guarantees.

## Technologies

TypeScript, React 19, Vite 8, Tailwind CSS 4, MobX Keystone, React Flow, Zod,
Comlink, Web Workers, the experimental browser WebMCP API, Vitest, Testing
Library, ESLint, TypeScript, pnpm, Cloudflare Workers runtime, and OpenAI Sites.

## Dataset

Northstar Commerce is a deterministic synthetic Australian outdoor-retailer
dataset generated locally in JavaScript. It contains 1,800 customers, 19,840
orders, 41,626 line items, and 160 products. No private source records or
external model were used. The generator, schema, and provenance are committed.

## Current limitations

- The public Site deployment succeeded; anonymous homepage and dashboard
  requests returned HTTP 200 on 4 September 2026.
- The reviewed source is public at <https://github.com/ihansel/tangle-webmcp>.
- No public demonstration video exists.
- The public tool surface is intentionally not a general Python/container
  executor and supports only curated workflows.
- The prior deployed build accepted unexpected additional fields for five
  empty-input tools because the transport did not enforce
  `additionalProperties: false`. A strict application-level guard and
  regression test are now deployed; five live client retests remain.
- `run_browser_pipeline` returns a detailed workload result; agents should
  prefer `get_run_summary` for concise output.
- Only ChatGPT's in-app Browser was tested in this run; Chrome was not tested.
