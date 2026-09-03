import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { PipelineSnapshot } from "../types";
import { executeBrowserPipeline } from "./engine";

const csv = readFileSync(
  resolve(process.cwd(), "public/datasets/equipment-failure.csv"),
  "utf8",
);
const purchaseCsv = readFileSync(
  resolve(process.cwd(), "public/datasets/customer-purchases.csv"),
  "utf8",
);
const productCsv = readFileSync(
  resolve(process.cwd(), "public/datasets/product-catalog.csv"),
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
    expect(first.kind).toBe("classification");
    expect(second.kind).toBe("classification");
    if (first.kind !== "classification" || second.kind !== "classification")
      throw new Error("Expected classification results");
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

  it("creates deterministic customer segments with bounded quality", async () => {
    const result = await executeBrowserPipeline(
      {
        name: "Purchase segments",
        bindingCount: 1,
        tasks: [
          {
            id: "cluster",
            name: "Four segments",
            componentId: "k-means",
            arguments: {
              features:
                "orders,spend,avg_basket,discount_share,days_since_order",
              clusters: "4",
              seed: "42",
            },
          },
        ],
      },
      purchaseCsv,
    );

    expect(result.kind).toBe("clustering");
    if (result.kind !== "clustering") throw new Error("Expected clustering");
    expect(result.clusters).toHaveLength(4);
    expect(
      result.clusters.reduce((sum, cluster) => sum + cluster.size, 0),
    ).toBe(40);
    expect(result.silhouetteScore).toBeGreaterThan(0);
  });

  it("embeds SKUs and returns real cosine neighbours", async () => {
    const result = await executeBrowserPipeline(
      {
        name: "SKU embeddings",
        bindingCount: 1,
        tasks: [
          {
            id: "embed",
            name: "Product vectors",
            componentId: "text-embedding",
            arguments: {
              id_column: "sku",
              text_columns: "name,category,description",
              dimensions: "24",
            },
          },
        ],
      },
      productCsv,
    );

    expect(result.kind).toBe("embedding");
    if (result.kind !== "embedding") throw new Error("Expected embeddings");
    expect(result.dimensions).toBe(24);
    expect(result.neighbors).toHaveLength(6);
    expect(result.neighbors[0].similarity).toBeGreaterThan(0.4);
    expect(result.neighbors[0].item).not.toBe(result.neighbors[0].match);
  });
});
