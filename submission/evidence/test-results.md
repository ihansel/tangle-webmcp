# Test results

Date: 4 September 2026 (Australia/Brisbane)

## Environment

- macOS on Apple Silicon
- Node.js 25.2.1
- pnpm 10.28.0
- TypeScript 5.9.3
- Vite 8.1.5
- Vitest 4.1.10
- Client: ChatGPT in-app Browser with page WebMCP capability; client version was
  not surfaced.
- Deployed origin: `https://tangle-webmcp.ian347727.chatgpt.site`

## Setup and static verification

| Command/check                            | Result                                                                                                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`         | **VERIFIED PASS** — lockfile current, dependencies already installed. pnpm reported ignored optional package build scripts.                                                                                 |
| `pnpm typecheck`                         | **VERIFIED PASS**.                                                                                                                                                                                          |
| `pnpm lint`                              | **VERIFIED PASS** — non-failing warning that eslint-plugin-react has no explicit React version setting.                                                                                                     |
| `pnpm build`                             | **VERIFIED PASS** — server and client built; Vite reported Pyodide Node-module externalization and large-chunk warnings.                                                                                    |
| `NODE_OPTIONS=--no-webstorage pnpm test` | **VERIFIED PASS** before final regression addition — 216 files passed; 2,260 tests passed; 2 todo; 0 failed. jsdom printed four expected “navigation not implemented” messages and listener-count warnings. |
| Focused WebMCP/data tests                | **VERIFIED PASS** before final regression addition — 2 files, 6 tests. A post-fix run is appended below.                                                                                                    |

Node 25 exposes incomplete Web Storage globals in this environment. Running the
suite without `--no-webstorage` previously caused unrelated localStorage test
failures; disabling Node's experimental globals lets jsdom supply the intended
implementation.

## Documented startup

Initial `pnpm start` failed because `vite.config.js` requested Worker
compatibility date 2026-06-01 while the locked local runtime supported through
2026-05-22. After a narrow change to 2026-05-22, Vite became ready and
`http://localhost:3001/` returned HTTP 200. Port 3000 was already occupied, so
Vite selected 3001. The local server was then stopped cleanly.

## Hosted human interface

- **VERIFIED:** HTTPS page loaded to the redesigned WebMCP commerce workspace.
- **VERIFIED:** no warning/error console messages across the home, Product2Vec,
  churn, or clustering tabs after the tested flows.
- **VERIFIED:** all four recipes opened as real Tangle v2 graphs.
- **VERIFIED:** graph nodes and panels were readable at a 1,800 × 1,200 viewport.
- **VERIFIED:** one-time agent permission, completion summaries, full reports,
  and visible failure state rendered.
- **VERIFIED:** churn, clustering, and Product2Vec reports contained charts,
  tables, and operational summaries.
- **BLOCKED for judges:** the existing production route and Sites control plane
  returned HTTP 404 during the public-release attempt.

## Hosted WebMCP interface

- **VERIFIED:** ten tools discovered from the deployed document.
- **VERIFIED:** registration metadata matched source definitions.
- **VERIFIED:** all ten tools exercised successfully where applicable.
- **VERIFIED:** empty/no-match states for run summary, component search, and undo
  (undo empty state in unit test).
- **VERIFIED:** typed invalid inputs rejected for search, add, configure,
  connect, and metrics inspection.
- **PARTIALLY VERIFIED:** deployed empty-input handlers ignored unexpected
  fields. A local guard now rejects them before side effects and has a regression
  test; deployment/retest remains.
- **VERIFIED:** agent run permission refusal, Worker 404 failure, visible error,
  undo recovery, and successful rerun.
- **VERIFIED:** browser console had no error on the home page; run failures were
  expected application states rather than console crashes.

## Failures and unresolved limitations

1. The existing production route and Sites control operations return HTTP 404;
   the rebuilt release archive is ready but could not be uploaded/deployed.
2. No public video exists.
3. The new strict no-input guard is not present in deployed version 10.
4. Full run results can be large; concise agent use should prefer
   `get_run_summary`.
5. Chrome/WebMCP was not tested.

## Post-fix verification

- Focused WebMCP/model/data tests: **PASS** — 3 files, 12 tests, 0 failed.
- Lint: **PASS** with the same non-failing React-version warning.
- Typecheck: **PASS**.
- Production build: **PASS** with the same documented bundle warnings.
- Public repository: **PASS** — anonymous GitHub API HTTP 200; `main` resolves;
  Apache-2.0 detected.
- Public release attempt: **BLOCKED** — Sites control plane and production route
  returned HTTP 404 after repeated checks.
