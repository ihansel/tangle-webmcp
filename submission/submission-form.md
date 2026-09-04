# Submission form copy

## 1. Project name

**Final recommendation:** Strand

Positioning: An independent WebMCP experiment built on Tangle; not an official
TangleML release.

## 2. Elevator pitch

> Strand gives people and agents one visible ML canvas: WebMCP tools build and
> undo pipelines, then train classifiers, clusters and Product2Vec locally
> without exposing data.

**Verified character count:** 172 characters, including spaces and punctuation.

## 3. Thumbnail

`submission/assets/thumbnail.png` — PNG, 1800 × 1200, 3:2, 2,327,065
bytes. Original ImageGen artwork; no third-party assets, trademarks, or text.

## 4. About the project

### Inspiration

Visual ML tools make pipelines understandable, but agents usually interact with
them through brittle clicking and scraping. Tangle already had the right human
surface: a real graph, typed components, validation, and undo. We wanted to make
that same workspace legible and safely actionable to any WebMCP-capable agent,
without replacing the canvas with a private chat protocol or moving the data to a
backend.

### What it does

Strand lets a person or agent assemble, configure, validate, run, and
interpret a curated machine-learning pipeline in the browser. Four prepared
stories cover equipment failure, customer churn, customer clustering, and
product embeddings. The advanced commerce demos use a deterministic synthetic
retailer with 1,800 customers, 19,840 orders, 41,626 line items, and 160
products. Outputs include classifier comparisons, confusion matrices, threshold
curves, segment maps, feature heatmaps, Product2Vec training loss, embedding
maps, similarity matrices, neighbour exploration, and merchandising ideas.

### Why this is a strong fit for WebMCP

A graph editor is hostile terrain for coordinate automation: nodes move, ports
are small, labels truncate, and a screenshot cannot reliably reveal stable task
identity or whether a mutation entered undo history. Tangle instead registers a
small set of structured, discoverable browser tools. An agent gets bounded JSON
schemas, stable task and component IDs, named ports, explicit validation, typed
results, and safe errors. That makes multi-step workflows—inspect, search, add,
configure, connect, validate, request execution, and compare results—more
reliable than page scraping while keeping the public capability surface narrow.

### How it creates a better user experience

The person never loses the visual model. Agent-created nodes and connections
appear on the same canvas, configuration stays inspectable, and grouped changes
use Tangle's normal undo. A visible panel reports tool availability, local-only
execution, run state, and the last agent action. An agent cannot start a run
until the person grants one-time permission. Results then appear as polished
reports that a person can explore rather than as an opaque block of agent text.

### What people and agents can now do together

An agent can inspect the current graph, find compatible components, build and
wire a pipeline, and explain what remains invalid. The person can review or
change the graph, approve one local run, inspect the report, and undo the agent's
latest change. The agent can then retrieve a bounded summary or classifier
metrics and explain the trade-off—for example, why logistic regression's 63.8%
recall beat the small decision tree's 61.4% recall in the included churn demo.

### How we built it

We kept the existing React, TypeScript, MobX Keystone, and React Flow editor as
the source of truth. A thin adapter reuses Tangle's task actions, port
connections, validator, compact serialization, and undo store. A deterministic
TypeScript ML engine runs in an ES-module Web Worker. The worker fetches an
included same-origin CSV, enforces row/column and training bounds, and supports
logistic regression, a small decision tree, K-means, TF-IDF embeddings, and a
compact Product2Vec model. React report components render the resulting metrics.
The demo is hosted on OpenAI Sites.

### How WebMCP was implemented

When the editor detects support, it calls
`document.modelContext.registerTool` for ten tools:
`get_pipeline_summary`, `search_components`, `add_pipeline_tasks`,
`configure_task`, `connect_tasks`, `validate_pipeline`,
`run_browser_pipeline`, `get_run_summary`, `inspect_model_metrics`, and
`undo_pipeline_change`. Inputs cap strings, arrays, tasks, and connections;
component IDs come from an explicit allowlist; adapter methods validate typed
inputs again. Read results are concise and do not return CSV rows. Mutations
operate on live UI state and enter normal undo groups. Agent runs require a
one-time permission, execute in a cancellable Worker, and report bounded
failures. During review we found that the deployed transport forwarded extra
fields to empty-input handlers, so a strict application-level guard and
regression test were added and deployed; five live client checks remain.

### Challenges we ran into

The hardest boundary was deciding what not to expose. Tangle can describe far
more components than this browser runner should execute, so we added an explicit
curated capability marker and separate editor/browser validation. We also had to
keep derived result payloads useful without sending source rows, make graph
layout readable for agent-created batches, keep deep links working on static
hosting, and fit meaningful model reports into the existing product language.
Submission review also uncovered a local Worker compatibility-date mismatch and
the empty-input runtime-validation gap; both now have narrow local fixes.

### Accomplishments that we’re proud of

The deployed page exposes ten genuine WebMCP tools, not a simulated tool list.
Agent graph changes are visible and undoable. The one-run permission boundary
works. Three different ML families execute inside the page: the verified
Product2Vec run trained 16-dimensional vectors for 160 products in 71 ms and
reduced loss from 0.693 to 0.324; churn compared two real classifiers; and
clustering profiled four customer segments. The generated commerce data is
reproducible, synthetic, and documented. The full automated suite passed 2,260
runnable tests in the review environment.

### What we learned

WebMCP works best as a compact intention-level contract rather than a mirror of
every internal UI command. Reusing the application's real state and undo system
is more trustworthy than maintaining an “agent copy” of the graph. Declared JSON
Schema is not enough by itself: safety-critical handlers should also validate at
runtime. And browser-local ML becomes far more persuasive when its output is
both agent-readable and genuinely explorable by a person.

### What’s next for Strand

First, publish the reviewed branch and make the demo accessible to judges.
Next, deploy the strict empty-input guard and make the run tool return the same
concise shape as `get_run_summary`. Product work would then add cancellation
controls to the visible UI, more explicit data-origin policies, saved run
comparisons, broader client testing, and additional curated components—without
turning the browser into an arbitrary code executor.

### What changed during the submission period

Tangle UI existed before this work. Starting from upstream commit `d7768e85`,
the `webmcp-hackathon` branch added the WebMCP adapter and ten tools, browser
Worker runner, bounded classical ML and Product2Vec engines, synthetic datasets,
four demo recipes, commerce landing page, result reports, readable agent graph
layout, one-run permission UI, Sites deep-link handling, tests, and provenance
documentation. Ten commits dated 3 September 2026 contain those changes. The
official event dates were not supplied, so the claim that every commit is inside
the formal submission window requires owner confirmation.

## 5. Built with

- TypeScript and JavaScript
- React 19, React Flow, MobX Keystone
- Vite 8 and Tailwind CSS 4
- Zod and Comlink
- WebMCP: `document.modelContext.registerTool`
- Web Workers and browser Fetch
- Deterministic in-browser logistic regression, small decision tree, K-means,
  TF-IDF, cosine similarity, PCA-style reporting projection, and Product2Vec
- Vitest, Testing Library, ESLint, TypeScript, Playwright configuration
- pnpm and Cloudflare Workers runtime
- OpenAI Sites hosting
- OpenAI Codex desktop for implementation, testing, and submission preparation
- OpenAI ImageGen for the original submission thumbnail

## 6. Try it out

- Live application:
  <https://tangle-webmcp.ian347727.chatgpt.site> — **verified public; anonymous
  homepage and dashboard requests returned HTTP 200**
- Public repository: <https://github.com/ihansel/tangle-webmcp> — verified
  public, default branch `main`, Apache-2.0 detected
- Public video: **[PUBLIC YOUTUBE URL REQUIRED]**
- Upstream project: <https://github.com/TangleML/tangle-ui>

## 7. Image gallery

Use the seven numbered PNGs in `submission/assets/gallery/`. Captions and
compliance details are in `asset-manifest.md`.

## 8. Video demo

Use the exact 2:38 plan in `submission/video/script.md`. Production and upload
materials are in `submission/video/`. Public URL:
**[PUBLIC YOUTUBE URL REQUIRED]**.

## 9. App status

**Functional beta; existing project substantially updated during the submission
period, pending confirmation of the official dates.**

The visual Tangle editor is mature upstream functionality. The open WebMCP
surface, curated browser runner, advanced demo recipes, reports, and hosted
commerce experience are hackathon additions. The tested workflows function, but
the public video and official submission-period confirmation are not yet
complete. The strict-input fix is deployed and awaits a live client retest.

## 10. Existing-project update explanation

The branch is based directly on upstream `d7768e85` (1 September 2026). Git
history shows ten hackathon commits on 3 September 2026, culminating in
`c13d2cb4`. Their diff adds 54 files/changes and approximately 70,929 inserted
lines, most of which are deterministic CSV fixtures. The substantive code adds
the WebMCP tool adapter, Worker execution engine, component allowlist, safety and
permission state, demo recipes, commerce homepage, chart/report components,
readable graph layout, Sites routing, tests, and documentation. Older Tangle
editor features are not claimed as new.

## 11. Live URL

<https://tangle-webmcp.ian347727.chatgpt.site>

**Status: VERIFIED PUBLIC.** The public Sites deployment succeeded. Anonymous
requests to the homepage and dashboard returned HTTP 200 on 4 September 2026;
the previously tested owner flow registered all ten tools and completed the
primary workflows.

## 12. Testing instructions

See `submission/testing-instructions.md`. The shortest path is: open SKU
embeddings, ask the agent to inspect and validate, request a run before approval,
grant one-time permission, rerun, and open the Product2Vec report. A fresh recipe
creates a reset state.

## 13. Public repository URL

<https://github.com/ihansel/tangle-webmcp>

The dedicated public repository contains the reviewed source, dependencies,
setup/test instructions, Apache-2.0 license, attribution, genuine WebMCP
registration, datasets, and submission assets. Anonymous GitHub API access
returned HTTP 200, `main` resolved to the reviewed commit, and GitHub detected
the Apache-2.0 license.

## 14. Tested agents or clients

| Client                 | Environment/version                                 | Date       | Workflow                                                                                                               | Result                                                                                          | Evidence                                                        |
| ---------------------- | --------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| ChatGPT in-app Browser | Codex desktop Browser runtime; version not surfaced | 4 Sep 2026 | Tool discovery; all ten tools; Product2Vec, churn, clustering; permission, invalid input, 404 recovery; UI/screenshots | Functional flow verified; site now public; deployed strict-input guard awaits five live retests | `evidence/webmcp-tools.md`, `evidence/test-results.md`, gallery |

No other client is claimed.

## 15. AI tools used

- **OpenAI Codex desktop:** implementation, repository inspection, local checks,
  in-app Browser/WebMCP testing, screenshot capture, and submission preparation.
- **OpenAI ImageGen:** original thumbnail artwork. It did not generate or alter
  any product screenshot.

Owner confirmation is requested if other AI development tools should be
disclosed.
