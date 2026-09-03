import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { PipelineSnapshot } from "../types";
import { executeBrowserPipeline } from "./engine";

const csv = readFileSync(
  resolve(process.cwd(), "public/datasets/equipment-failure.csv"),
  "utf8",
);

const pipeline: PipelineSnapshot = {
  name: "Equipment failure comparison",
  bindingCount: 12,
  tasks: [
    {
      id: "split",
      name: "Split",
      componentId: "train-test-split",
      arguments: { seed: "42", test_ratio: "0.25" },
    },
    {
      id: "logistic",
      name: "Logistic regression",
      componentId: "logistic-regression",
      arguments: { iterations: "800", learning_rate: "0.1" },
    },
    {
      id: "tree",
      name: "Small decision tree",
      componentId: "decision-tree",
      arguments: { max_depth: "4", min_samples: "3" },
    },
  ],
};

describe("browser runner engine", () => {
  it("trains both classifiers deterministically and returns bounded metrics", async () => {
    const first = await executeBrowserPipeline(pipeline, csv);
    const second = await executeBrowserPipeline(pipeline, csv);

    expect(first.rowCount).toBe(60);
    expect(first.models).toHaveLength(2);
    expect(first.models.map((model) => model.metrics)).toEqual(
      second.models.map((model) => model.metrics),
    );
    for (const model of first.models) {
      expect(model.metrics.recall).toBeGreaterThanOrEqual(0);
      expect(model.metrics.recall).toBeLessThanOrEqual(1);
      expect(
        model.metrics.confusionMatrix.falseNegative,
      ).toBeGreaterThanOrEqual(0);
    }
    expect(first.selectionReason).toContain("missed equipment failures");
  });

  it("rejects a pipeline without a supported classifier", async () => {
    await expect(
      executeBrowserPipeline(
        { ...pipeline, tasks: pipeline.tasks.slice(0, 1) },
        csv,
      ),
    ).rejects.toThrow("supported classifier");
  });
});
