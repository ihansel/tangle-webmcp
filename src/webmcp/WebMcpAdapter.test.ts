import { describe, expect, it } from "vitest";

import { ComponentSpec } from "@/models/componentSpec";
import { UndoStore } from "@/routes/v2/pages/Editor/store/undoStore";
import { EDITOR_POSITION_ANNOTATION } from "@/utils/annotations";

import { DEMO_RECIPE_BY_ID } from "./demoRecipes";
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

    const positions = spec.tasks.map((task) =>
      task.annotations.get(EDITOR_POSITION_ANNOTATION),
    ) as Array<{ x: number; y: number }>;
    const columns = new Map<number, number[]>();
    for (const position of positions) {
      columns.set(position.x, [...(columns.get(position.x) ?? []), position.y]);
    }
    const orderedColumns = [...columns.keys()].sort((a, b) => a - b);
    expect(orderedColumns).toHaveLength(8);
    expect(
      orderedColumns
        .slice(1)
        .every((x, index) => x - orderedColumns[index] >= 440),
    ).toBe(true);
    expect(
      [...columns.values()].every((rows) =>
        rows.length < 2
          ? true
          : Math.min(...rows.slice(1).map((y, index) => y - rows[index])) >=
            480,
      ),
    ).toBe(true);

    const validation = await adapter.validatePipeline();
    expect(validation.browserExecutable).toBe(true);

    const undone = await adapter.undoPipelineChange();
    expect(undone.success).toBe(true);
    expect(spec.tasks).toHaveLength(0);
    expect(spec.bindings).toHaveLength(0);

    const emptyUndo = await adapter.undoPipelineChange();
    expect(emptyUndo).toEqual({
      success: false,
      error: "There is no pipeline change to undo.",
    });
  });

  it("does not accept arbitrary component IDs", () => {
    const { adapter } = createHarness();
    expect(() =>
      adapter.addPipelineTasks({
        tasks: [{ clientId: "unsafe", componentId: "arbitrary-python" }],
      }),
    ).toThrow();
  });

  it("builds the two-model retail forecasting graph with valid ports", async () => {
    const { adapter, spec } = createHarness();
    const recipe = DEMO_RECIPE_BY_ID.get("forecast");
    if (!recipe) throw new Error("Forecast recipe is missing");

    const result = adapter.addPipelineTasks(recipe.batch);

    expect(result.created).toHaveLength(6);
    expect(spec.bindings).toHaveLength(6);
    await expect(adapter.validatePipeline()).resolves.toEqual(
      expect.objectContaining({ browserExecutable: true }),
    );
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

  it("rejects unexpected input for no-input tools before side effects", async () => {
    const { adapter, spec } = createHarness();
    adapter.addPipelineTasks({ tasks: FAILURE_DEMO_BATCH.tasks.slice(0, 1) });
    const noInputTools = createWebMcpToolDefinitions(adapter).filter((tool) =>
      [
        "get_pipeline_summary",
        "validate_pipeline",
        "run_browser_pipeline",
        "get_run_summary",
        "undo_pipeline_change",
      ].includes(tool.name),
    );

    for (const tool of noInputTools) {
      await expect(tool.execute({ unexpected: true })).rejects.toThrow(
        "empty object only",
      );
    }
    expect(spec.tasks).toHaveLength(1);
  });
});
