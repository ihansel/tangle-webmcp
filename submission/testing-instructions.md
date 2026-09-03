# Judge testing instructions

These instructions assume the live URL has been made publicly accessible. No
credentials have been supplied for sharing.

## Supported client

- ChatGPT in-app Browser with WebMCP support; tested 4 September 2026.
- Google Chrome/WebMCP: not tested; do not claim support until verified.

## Primary flow

1. Open <https://tangle-webmcp.ian347727.chatgpt.site>.
2. Under **Choose an experiment**, open **Embed a product catalogue**.
3. Confirm that the visible runner says **10 tools shared**.
4. Ask the agent: “Inspect this pipeline, validate it, and summarize what will
   run locally.”
5. Ask: “Run the pipeline and explain the strongest learned SKU groups.”
6. Confirm the run is refused until you click **Allow the next agent-triggered
   run**.
7. Click that one-time permission, repeat the run request, and open the full
   report.
8. Expected result: a 16-dimensional, 80-epoch Product2Vec run over 160 products,
   with a training-loss chart, product map, neighbour explorer, similarity
   heatmap, category cohesion, co-purchase network, and bundle opportunities.

## Classification flow

1. Return to the home page and open **Find customers at risk of churn**.
2. Click the one-time run permission.
3. Ask: “Run this locally, inspect both model metrics, and recommend the model
   with the better recall.”
4. Expected deterministic result for the included seed: logistic regression
   recall about 63.8%, decision-tree recall about 61.4%, with logistic regression
   selected.

## Visible collaboration and undo

Ask:

> Add a temporary CSV loader and column selector, connect the loader's dataset
> output to the selector's dataset input, then show me the pipeline summary.

Confirm that both tasks and the connection appear on the canvas. Then ask:

> Undo your most recent pipeline change.

The latest grouped graph change should disappear through normal Tangle undo.

## Error/recovery check

For a non-destructive demo, ask the agent to validate an open pipeline before
permission is granted. A run request must return a user-confirmation error. After
granting permission, the next request should run. Do not change the dataset path
in a judge demo unless intentionally showing the recoverable 404 path.

## Reset

Recipes create a new local pipeline each time. Return to the home page and reopen
the recipe for a fresh state. Pipeline state is stored in browser storage.

## Known limitations

- Public judge access is not yet enabled.
- Only curated browser components execute locally.
- The local strict empty-input validation fix must be deployed before relying on
  `additionalProperties: false` for the five no-input tools.
- Results are educational synthetic-data demonstrations, not production
  predictions.
