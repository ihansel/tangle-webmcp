import type { WebMcpAdapter } from "./WebMcpAdapter";

const emptyObjectSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const literalValue = { type: ["string", "number", "boolean"] } as const;

function annotations(readOnlyHint: boolean) {
  return {
    readOnlyHint,
    destructiveHint: false,
    idempotentHint: readOnlyHint,
    openWorldHint: false,
    untrustedContentHint: false,
  };
}

export function createWebMcpToolDefinitions(
  adapter: WebMcpAdapter,
): ModelContextToolDefinition[] {
  const execute =
    (name: string, handler: (input: unknown) => unknown | Promise<unknown>) =>
    async (input: unknown, context?: ModelContextToolExecutionContext) => {
      context?.signal?.throwIfAborted();
      adapter.runStore.recordToolCall(name);
      const onAbort = () => {
        if (name === "run_browser_pipeline") adapter.runStore.cancel();
      };
      context?.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        return await handler(input);
      } finally {
        context?.signal?.removeEventListener("abort", onAbort);
      }
    };

  return [
    {
      name: "get_pipeline_summary",
      description:
        "Inspect the open Tangle pipeline as a bounded task and connection summary. Use before planning edits and after mutations.",
      inputSchema: emptyObjectSchema,
      annotations: annotations(true),
      execute: execute("get_pipeline_summary", () =>
        adapter.getPipelineSummary(),
      ),
    },
    {
      name: "search_components",
      description:
        "Search only the curated components that can execute safely in this browser runner. Returns stable component IDs and port names.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            maxLength: 120,
            description: "Capability or component name to find.",
          },
          limit: { type: "integer", minimum: 1, maximum: 16, default: 16 },
        },
        additionalProperties: false,
      },
      annotations: annotations(true),
      execute: execute("search_components", (input) =>
        adapter.searchComponents(input),
      ),
    },
    {
      name: "add_pipeline_tasks",
      description:
        "Add and optionally connect a bounded batch of curated tasks as one visible undoable Tangle graph change. Use client IDs to connect tasks within the same batch.",
      inputSchema: {
        type: "object",
        required: ["tasks"],
        properties: {
          tasks: {
            type: "array",
            minItems: 1,
            maxItems: 16,
            items: {
              type: "object",
              required: ["clientId", "componentId"],
              properties: {
                clientId: { type: "string", minLength: 1, maxLength: 48 },
                componentId: {
                  type: "string",
                  enum: [
                    "load-csv",
                    "select-columns",
                    "fill-missing",
                    "encode-categories",
                    "train-test-split",
                    "logistic-regression",
                    "decision-tree",
                    "evaluate",
                    "compare-metrics",
                    "k-means",
                    "profile-clusters",
                    "text-embedding",
                    "nearest-neighbors",
                  ],
                },
                name: { type: "string", minLength: 1, maxLength: 100 },
                configuration: {
                  type: "object",
                  additionalProperties: literalValue,
                },
              },
              additionalProperties: false,
            },
          },
          connections: {
            type: "array",
            maxItems: 24,
            items: {
              type: "object",
              required: [
                "sourceClientId",
                "sourcePort",
                "targetClientId",
                "targetPort",
              ],
              properties: {
                sourceClientId: { type: "string", minLength: 1, maxLength: 48 },
                sourcePort: { type: "string", minLength: 1, maxLength: 100 },
                targetClientId: { type: "string", minLength: 1, maxLength: 48 },
                targetPort: { type: "string", minLength: 1, maxLength: 100 },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
      annotations: annotations(false),
      execute: execute("add_pipeline_tasks", (input) =>
        adapter.addPipelineTasks(input),
      ),
    },
    {
      name: "configure_task",
      description:
        "Set one literal configuration value on a visible task through Tangle's normal undoable state model.",
      inputSchema: {
        type: "object",
        required: ["taskId", "inputName", "value"],
        properties: {
          taskId: { type: "string", minLength: 1, maxLength: 100 },
          inputName: { type: "string", minLength: 1, maxLength: 100 },
          value: literalValue,
        },
        additionalProperties: false,
      },
      annotations: annotations(false),
      execute: execute("configure_task", (input) =>
        adapter.configureTask(input),
      ),
    },
    {
      name: "connect_tasks",
      description:
        "Connect a bounded batch of existing task ports as one visible undoable graph change.",
      inputSchema: {
        type: "object",
        required: ["connections"],
        properties: {
          connections: {
            type: "array",
            minItems: 1,
            maxItems: 24,
            items: {
              type: "object",
              required: [
                "sourceTaskId",
                "sourcePort",
                "targetTaskId",
                "targetPort",
              ],
              properties: {
                sourceTaskId: { type: "string", minLength: 1, maxLength: 100 },
                sourcePort: { type: "string", minLength: 1, maxLength: 100 },
                targetTaskId: { type: "string", minLength: 1, maxLength: 100 },
                targetPort: { type: "string", minLength: 1, maxLength: 100 },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
      annotations: annotations(false),
      execute: execute("connect_tasks", (input) => adapter.connectTasks(input)),
    },
    {
      name: "validate_pipeline",
      description:
        "Validate the live Tangle graph and separately report whether every task is supported by the curated browser runner.",
      inputSchema: emptyObjectSchema,
      annotations: annotations(true),
      execute: execute("validate_pipeline", () => adapter.validatePipeline()),
    },
    {
      name: "run_browser_pipeline",
      description:
        "Run the validated curated pipeline locally in a cancellable worker. The person must first allow the next agent run in the visible panel.",
      inputSchema: emptyObjectSchema,
      annotations: annotations(false),
      execute: execute("run_browser_pipeline", () =>
        adapter.runBrowserPipeline(true),
      ),
    },
    {
      name: "get_run_summary",
      description:
        "Read bounded classification, clustering, or embedding insights for the current or latest local browser run without returning dataset rows.",
      inputSchema: emptyObjectSchema,
      annotations: annotations(true),
      execute: execute("get_run_summary", () => adapter.getRunSummary()),
    },
    {
      name: "inspect_model_metrics",
      description:
        "Inspect bounded recall, precision, F1, accuracy, and confusion-matrix metrics from the latest local run for one model or all models.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: { type: "string", minLength: 1, maxLength: 100 },
        },
        additionalProperties: false,
      },
      annotations: annotations(true),
      execute: execute("inspect_model_metrics", (input) =>
        adapter.inspectModelMetrics(input),
      ),
    },
    {
      name: "undo_pipeline_change",
      description:
        "Undo the most recent normal Tangle pipeline change, including a batched agent-created edit, and return the updated bounded summary.",
      inputSchema: emptyObjectSchema,
      annotations: annotations(false),
      execute: execute("undo_pipeline_change", () =>
        adapter.undoPipelineChange(),
      ),
    },
  ];
}
