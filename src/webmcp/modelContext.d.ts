interface ModelContextToolExecutionContext {
  signal?: AbortSignal;
}

interface ModelContextToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (
    input: unknown,
    context?: ModelContextToolExecutionContext,
  ) => unknown | Promise<unknown>;
}

interface ModelContext {
  registerTool(
    definition: ModelContextToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
}

interface Document {
  modelContext?: ModelContext;
}
