# Validation report

Validation date: 4 September 2026 (Australia/Brisbane)

Overall: **NOT READY — ACTION REQUIRED**

## Automated artifact checks

| Requirement                             | Status | Evidence                                                               | Required action                       | Owner               |
| --------------------------------------- | ------ | ---------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| Pitch length ≤200                       | PASS   | Node character count = 172.                                            | None.                                 | Submission producer |
| Thumbnail exact 3:2                     | PASS   | 1800 × 1200.                                                           | None.                                 | Submission producer |
| Thumbnail below 5 MB                    | PASS   | 2,327,065 bytes.                                                       | None.                                 | Submission producer |
| Gallery formats                         | PASS   | 7/7 files are PNG.                                                     | None.                                 | Submission producer |
| Gallery count ≤15                       | PASS   | 7.                                                                     | None.                                 | Submission producer |
| Gallery sizes below 5 MB                | PASS   | Largest = 149,274 bytes.                                               | None.                                 | Submission producer |
| Gallery preferred ratio                 | PASS   | 7/7 are 1800 × 1200 (3:2).                                             | None.                                 | Submission producer |
| Proposed video below 3 minutes          | PASS   | 158 seconds (2:38).                                                    | None.                                 | Submission producer |
| Local referenced files exist            | PASS   | Validation script checked package paths and Markdown local references. | Re-run after manual URL insertion.    | Project owner       |
| `submission.json` parses                | PASS   | `jq empty submission/submission.json`.                                 | None.                                 | Submission producer |
| Source contains genuine registration    | PASS   | Exact `document.modelContext.registerTool` call found.                 | None.                                 | Submission producer |
| Repository has license                  | PASS   | `LICENSE` exists and begins “Apache License Version 2.0.”              | Verify eventual public fork metadata. | Project owner       |
| Generated materials obvious-secret scan | PASS   | No API-key/private-key/bearer-token patterns found.                    | Re-run after edits.                   | Project owner       |

## Application and publication checks

| Requirement                            | Status  | Evidence                                                                 | Required action                               | Owner               |
| -------------------------------------- | ------- | ------------------------------------------------------------------------ | --------------------------------------------- | ------------------- |
| Lockfile install                       | PASS    | Frozen install completed.                                                | None.                                         | Submission producer |
| Local startup                          | PASS    | After compatibility fix, Vite served HTTP 200 on localhost.              | None.                                         | Project owner       |
| Lint                                   | PASS    | Final exit code 0; one non-failing configuration warning.                | Optional warning cleanup.                     | Project team        |
| Typecheck                              | PASS    | Final exit code 0.                                                       | None.                                         | Submission producer |
| Focused WebMCP/model tests             | PASS    | Final focused run result recorded below.                                 | None.                                         | Submission producer |
| Production build                       | PASS    | Final exit code 0; non-failing bundle warnings documented.               | Optional code splitting.                      | Project team        |
| Full test suite                        | PASS    | 216 files, 2,260 passed, 2 todo, 0 failed using documented Node 25 flag. | None.                                         | Submission producer |
| Live application reachable for owner   | PASS    | HTTPS home and recipes loaded in authenticated in-app Browser.           | None.                                         | Project owner       |
| Live application reachable anonymously | PASS    | Public homepage and dashboard returned HTTP 200 anonymously.             | None.                                         | Project owner       |
| Live primary workflow                  | PASS    | Product2Vec, churn, clustering, permission, reports, 404 recovery.       | None.                                         | Submission producer |
| Deployed strict no-input handling      | PARTIAL | Strict guard and test are deployed; five live client checks remain.      | Rerun five checks in a WebMCP-capable client. | Submission producer |
| Public repository resolves             | PASS    | Anonymous API HTTP 200; public `main`; Apache-2.0 detected.              | None for current release.                     | Project owner       |
| Public video resolves                  | BLOCKED | URL is null.                                                             | Record/upload and verify.                     | Project owner       |

## Final focused verification

- Focused tests: **PASS** — 3 files, 12 tests, 0 failed.
- Lint: **PASS** — exit 0; one non-failing React-version warning.
- Typecheck: **PASS** — exit 0.
- Production build: **PASS** — server/client build and TypeScript completed;
  non-failing Pyodide externalization, chunk-size, and code-splitting warnings.

The overall status remains not ready until publication blockers are cleared.

## Observed non-failing warnings

- pnpm ignored install scripts for four dependencies under the current
  `approve-builds` policy.
- ESLint warned that the React version is not specified in plugin settings.
- Vite externalized Node imports from the upstream Pyodide package for browser
  compatibility and warned about a >500 kB chunk.
- Vitest/jsdom printed navigation-not-implemented and maximum-listener warnings,
  but all runnable tests passed.

## Integrity note

The reviewed source was committed and pushed to the public repository, then
verified through an anonymous GitHub API request. The exact source was rebuilt,
its 12 focused tests passed, and it was deployed publicly through Sites.
Anonymous homepage and dashboard requests returned HTTP 200. No video was
uploaded. Run IDs are ephemeral evidence, not durable public records.
