# Judge demo guide

## Best 90-second path

1. **Open the home page (10 s).** Point out one connected synthetic commerce
   dataset and the three advanced analysis stories: churn, segments, and product
   relationships.
2. **Open SKU embeddings (10 s).** Show the real Tangle graph and the “10 tools
   shared” status.
3. **Discover and inspect (15 s).** Ask the agent to list the tools, inspect the
   pipeline, and validate it. Emphasize stable schemas instead of visual scraping.
4. **Show the safety boundary (10 s).** Ask for a run before permission. The
   refusal should name the visible one-time approval.
5. **Approve and run (15 s).** Click the permission once and rerun through
   WebMCP. The Worker should complete in well under a second on the included data.
6. **Review together (20 s).** Open the report. Highlight falling loss, the
   embedding map, learned neighbours, and an unexpected cross-category bundle.
7. **Close (10 s).** Explain that agent graph changes are visible and undoable,
   source rows stay in the page, and the same interface runs churn and clustering.

## Strongest WebMCP sentence

“The agent is not clicking coordinates or scraping the canvas: Tangle gives it a
small, typed set of graph and analysis tools, while the person still sees every
change, grants execution once, and can undo normally.”

## Backup paths

- If embeddings fail, open churn and use the verified recall comparison.
- If WebMCP discovery is unavailable, show the “10 tools shared” panel and the
  source registration at `src/webmcp/useWebMcp.ts:50`; do not pretend a tool was
  invoked.
- If the Site prompts for access, stop: public judging access is not configured.
