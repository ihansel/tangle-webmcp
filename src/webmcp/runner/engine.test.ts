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
  resolve(process.cwd(), "public/datasets/northstar-commerce/customers.csv"),
  "utf8",
);
const productCsv = readFileSync(
  resolve(process.cwd(), "public/datasets/northstar-commerce/products.csv"),
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
    expect(first.thresholdCurve).toHaveLength(9);
    expect(first.riskDistribution).toHaveLength(5);
    expect(first.featureDrivers.length).toBeGreaterThan(0);
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
                "orders,spend,avg_basket,discount_share,return_rate,days_since_order,email_engagement",
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
    ).toBe(1_800);
    expect(result.silhouetteScore).toBeGreaterThan(0);
    expect(result.points.length).toBeGreaterThan(100);
    expect(result.centroids).toHaveLength(4);
    expect(
      result.clusters.every((cluster) => cluster.examples.length > 0),
    ).toBe(true);
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
              dimensions: "32",
            },
          },
        ],
      },
      productCsv,
    );

    expect(result.kind).toBe("embedding");
    if (result.kind !== "embedding") throw new Error("Expected embeddings");
    expect(result.dimensions).toBe(32);
    expect(result.neighbors).toHaveLength(6);
    expect(result.neighbors[0].similarity).toBeGreaterThan(0.4);
    expect(result.neighbors[0].item).not.toBe(result.neighbors[0].match);
    expect(result.points).toHaveLength(160);
    expect(result.products).toHaveLength(160);
    expect(result.categoryCohesion).toHaveLength(8);
    expect(result.coPurchaseLinks.length).toBeGreaterThan(0);
    expect(result.unexpectedPairs).toHaveLength(6);
  });

  it("trains deterministic Product2Vec embeddings from co-purchase context", async () => {
    const product2VecPipeline: PipelineSnapshot = {
      name: "Learned SKU embeddings",
      bindingCount: 2,
      tasks: [
        {
          id: "embed",
          name: "Train Product2Vec",
          componentId: "product2vec",
          arguments: {
            id_column: "sku",
            context_column: "copurchase_skus",
            dimensions: "16",
            epochs: "80",
            learning_rate: "0.04",
            negative_samples: "4",
            seed: "42",
          },
        },
        {
          id: "neighbors",
          name: "Find learned neighbours",
          componentId: "nearest-neighbors",
          arguments: { neighbors: "3" },
        },
      ],
    };
    const first = await executeBrowserPipeline(product2VecPipeline, productCsv);
    const second = await executeBrowserPipeline(
      product2VecPipeline,
      productCsv,
    );

    expect(first.kind).toBe("embedding");
    expect(second.kind).toBe("embedding");
    if (first.kind !== "embedding" || second.kind !== "embedding")
      throw new Error("Expected Product2Vec embeddings");
    expect(first.algorithm).toBe("product2vec");
    expect(first.dimensions).toBe(16);
    expect(first.training).not.toBeNull();
    expect(first.training?.epochs).toBe(80);
    expect(first.training?.pairCount).toBeGreaterThan(500);
    expect(first.training?.finalLoss).toBeLessThan(
      first.training?.initialLoss ?? 0,
    );
    expect(first.training?.contextSimilarity).toBeGreaterThan(
      first.training?.baselineSimilarity ?? 1,
    );
    expect(first.neighbors).toEqual(second.neighbors);
    expect(first.training?.lossCurve).toEqual(second.training?.lossCurve);
    expect(first.products).toHaveLength(160);
    expect(first.points).toHaveLength(160);
  });
});
