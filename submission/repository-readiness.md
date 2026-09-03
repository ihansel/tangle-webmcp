# Repository readiness review

## Outcome

**Local repository and public submission repository: ready to build and
review.**

The local branch contains the source, datasets, lockfile, license, attribution,
tests, documentation, and generated submission assets. The current GitHub remote
retains the public upstream project as `origin`; the dedicated public submission
repository is <https://github.com/ihansel/tangle-webmcp>, configured as the
`public` remote, and serves the reviewed release from `main`.

## Clone-first checklist

| README item        | Status  | Finding                                                                                         |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------- |
| Project summary    | PASS    | Existing Tangle summary plus new WebMCP branch summary.                                         |
| Screenshot/visual  | PASS    | New README references the real home screenshot.                                                 |
| WebMCP explanation | PASS    | Explains structured tools, visibility, permission, and undo.                                    |
| Feature list       | PASS    | Upstream features and curated demo workflows are listed.                                        |
| Prerequisites      | PASS    | Node.js and pnpm are named; exact pnpm version is in `package.json`.                            |
| Installation       | PASS    | Frozen-lockfile installation is documented and exercised.                                       |
| Configuration      | PASS    | Environment variables remain documented; demos need no backend/API key.                         |
| Run instructions   | PASS    | `pnpm start` documented and exercised after compatibility-date fix.                             |
| Test instructions  | PASS    | Node 25 Web Storage workaround and verification commands documented.                            |
| Tool inventory     | PASS    | All ten tools listed.                                                                           |
| Example prompts    | PASS    | Four representative prompts included.                                                           |
| Architecture       | PASS    | Architecture note linked and updated for three workload families.                               |
| Deployment         | PASS    | Public Sites release deployed; anonymous homepage and dashboard requests returned HTTP 200.     |
| Limitations        | PASS    | Curated scope, client coverage, deployed validation gap, and publication blockers are explicit. |
| License            | PASS    | Root `LICENSE` is Apache-2.0; upstream GitHub detects a license.                                |
| Demo/live links    | PARTIAL | Public repository and Sites URL work; public video is still missing.                            |

## Reproducibility

- `pnpm install --frozen-lockfile`: PASS; lockfile already current.
- `pnpm start`: initial FAIL because the configured compatibility date was
  newer than the installed Worker runtime; PASS after changing it from
  2026-06-01 to 2026-05-22. Local HTTP response was 200.
- `pnpm build`: PASS.
- `pnpm lint`: PASS with a non-failing React-version configuration warning.
- `pnpm typecheck`: PASS.
- `NODE_OPTIONS=--no-webstorage pnpm test`: PASS before the final regression
  test (216 files, 2,260 passed, 2 todo); the post-fix focused suite is recorded
  in `evidence/test-results.md`.

## Source and assets

- Genuine registration exists in `src/webmcp/useWebMcp.ts`.
- Tool schemas and annotations exist in `src/webmcp/toolDefinitions.ts`.
- Browser Worker execution and deterministic engine are committed.
- Synthetic datasets include generator, schema, and provenance.
- No required private credential was copied into the repository or submission.
- A pattern scan of tracked files found no obvious committed API key, private
  key, or bearer token; this is not a substitute for a dedicated secret scanner.

## Safe fixes made during this review

1. Adjusted the Worker compatibility date so the documented local start command
   works with the locked runtime.
2. Added strict application-level empty-object validation for five no-input
   tools and a regression test.
3. Added a WebMCP-focused README section and updated a stale classification-only
   architecture statement.

These changes are committed and pushed to the public submission repository.
They are deployed publicly through Sites.

## Required repository action

No further repository publication action is required for the current release.
Anonymous GitHub API access returned HTTP 200, `main` resolves to the reviewed
commit, and GitHub detects the Apache-2.0 license.
