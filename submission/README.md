# Tangle WebMCP submission package

Overall status: **NOT READY — ACTION REQUIRED**

The written submission, evidence, real screenshot gallery, original thumbnail,
judge guide, and sub-three-minute video plan are complete. Three mandatory
publication items remain:

1. make the live Site accessible to judges (an unauthenticated request currently
   receives HTTP 401);
2. publish the reviewed source to the newly created public repository; and
3. record and publicly upload the planned demo video.

The public repository has been created at
<https://github.com/ihansel/tangle-webmcp>; source publication and anonymous
verification are part of the final release sequence.

## Recommended submission copy

- **Project:** Tangle WebMCP
- **Elevator pitch (172 characters):** Tangle gives people and agents one visible
  ML canvas: WebMCP tools build and undo pipelines, then train classifiers,
  clusters and Product2Vec locally without exposing data.
- **App status:** Functional beta; an existing open-source project substantially
  extended by the hackathon branch, subject to confirmation of the official
  submission-period dates.

The ready-to-paste fields are in [submission-form.md](submission-form.md) and
[submission-form.txt](submission-form.txt). Machine-readable values are in
[submission.json](submission.json).

## Package map

- [project-facts.md](project-facts.md) — verified product and provenance facts
- [requirements-checklist.md](requirements-checklist.md) — requirement status and
  owners
- [validation-report.md](validation-report.md) — automated and manual validation
- [testing-instructions.md](testing-instructions.md) — judge-facing steps
- [judge-demo-guide.md](judge-demo-guide.md) — short live demo flow
- [repository-readiness.md](repository-readiness.md) — clone-first review
- [asset-manifest.md](asset-manifest.md) — thumbnail and screenshot compliance
- [links.md](links.md) — verified and unresolved URLs
- [evidence/](evidence/) — tool inventory, test results, and source references
- [video/](video/) — exact script, shots, production notes, metadata, checklist

## Final owner actions

1. Approve changing the Sites access mode from custom/owner-only to public, or
   provide an approved judge-access method.
2. Push the reviewed tree to <https://github.com/ihansel/tangle-webmcp>,
   preserving the Apache-2.0 license and upstream attribution, then verify it
   anonymously.
3. Confirm the official submission-period dates.
4. Record the 2:38 script, edit to under 3:00, upload publicly to YouTube, and add
   the URL to `links.md`, both submission forms, and `submission.json`.
5. Publish the local strict no-input validation and compatibility-date fixes to
   the Site, then rerun the five deployed no-input schema checks.
