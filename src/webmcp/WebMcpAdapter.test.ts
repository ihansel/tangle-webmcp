import { describe, expect, it } from "vitest";

import { ComponentSpec } from "@/models/componentSpec";
import { UndoStore } from "@/routes/v2/pages/Editor/store/undoStore";

import { FAILURE_DEMO_BATCH } from "./failureDemoFixture";
import { createWebMcpToolDefinitions } from "./toolDefinitions";
import { WebMcpAdapter } from "./WebMcpAdapter";

function createHarness() {
  const spec = new ComponentSpec({
    $id: "pipeline_1",
    name: "Equipment failure",
  });
  const undo = new UndoStore();
  undo.init(spec);
  const adapter = new WebMcpAdapter({
    getSpec: () => spec,
    getActiveSubgraphPath: () => [],
    undo,
  });
  return { adapter, spec, undo };
}

describe("WebMcpAdapter", () => {
  it("adds the complete hero graph as one undoable visible mutation", async () => {
    const { adapter, spec, undo } = createHarness();
    const result = adapter.addPipelineTasks(FAILURE_DEMO_BATCH);

    expect(result.created).toHaveLength(10);
    expect(spec.tasks).toHaveLength(10);
    expect(spec.bindings).toHaveLength(12);
    expect(undo.undoLevels).toBe(1);

    const validation = await adapter.validatePipeline();
    expect(validation.browserExecutable).toBe(true);

    const undone = await adapter.undoPipelineChange();
    expect(undone.success).toBe(true);
    expect(spec.tasks).toHaveLength(0);
    expect(spec.bindings).toHaveLength(0);
  });

  it("does not accept arbitrary component IDs", () => {
    const { adapter } = createHarness();
    expect(() =>
      adapter.addPipelineTasks({
        tasks: [{ clientId: "unsafe", componentId: "arbitrary-python" }],
      }),
    ).toThrow();
  });

  it("returns summaries without raw component specs or data", async () => {
    const { adapter } = createHarness();
    adapter.addPipelineTasks({ tasks: FAILURE_DEMO_BATCH.tasks.slice(0, 1) });
    const summary = await adapter.getPipelineSummary();

    expect(summary.tasks[0]).toEqual(
      expect.objectContaining({
        componentId: "load-csv",
        browserExecutable: true,
      }),
    );
    expect(JSON.stringify(summary)).not.toContain("implementation");
    expect(JSON.stringify(summary)).not.toContain("equipment-failure.csv\n");
  });

  it("supports WebMCP clients that omit the optional execution context", async () => {
    const { adapter } = createHarness();
    const tool = createWebMcpToolDefinitions(adapter).find(
      (candidate) => candidate.name === "get_pipeline_summary",
    );

    await expect(tool?.execute({})).resolves.toEqual(
      expect.objectContaining({ taskCount: 0, bindingCount: 0 }),
    );
  });
});
