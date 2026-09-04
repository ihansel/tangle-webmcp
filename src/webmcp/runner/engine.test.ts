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
const dailySalesCsv = readFileSync(
  resolve(process.cwd(), "public/datasets/northstar-commerce/daily-sales.csv"),
  "utf8",
);
const buyerProfileCsv = readFileSync(
  resolve(
    process.cwd(),
    "public/datasets/northstar-commerce/buyer-profiles.csv",
  ),
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

  it("runs the protected buyer-profile sample and returns real experiment metadata", async () => {
    const experiment = {
      runId: "modal-test",
      teacherModel: "Qwen/Qwen3.5-4B",
      studentModel: "Qwen/Qwen3.5-0.8B",
      adapterVersion: "test",
      trainingExamples: 1_440,
      evaluationExamples: 80,
      generationMinutes: 8.2,
      trainingMinutes: 18.4,
      maxSteps: 420,
      profilesPerSecond: 11.2,
      lossCurve: [
        { step: 10, loss: 1.8 },
        { step: 420, loss: 0.3 },
      ],
      scorecard: {
        teacher: {
          name: "Curated teacher",
          schemaValidity: 1,
          labelAccuracy: 1,
          evidenceGrounding: 1,
          judgeScore: 100,
        },
        base: {
          name: "Base",
          schemaValidity: 0.7,
          labelAccuracy: 0.5,
          evidenceGrounding: 0.6,
          judgeScore: 57.5,
        },
        student: {
          name: "Student",
          schemaValidity: 1,
          labelAccuracy: 0.9,
          evidenceGrounding: 0.95,
          judgeScore: 93.8,
        },
      },
      slices: [
        {
          label: "At-risk shoppers",
          count: 20,
          baseScore: 52,
          studentScore: 91,
        },
      ],
    };
    const fetcher = (async (input: RequestInfo | URL) => {
      const customerId = decodeURIComponent(
        String(input).split("/").at(-1) ?? "",
      );
      return new Response(
        JSON.stringify({
          profile: {
            customerId,
            valid: true,
            summary: "A grounded synthetic buyer profile.",
            lifecycleStage: "active",
            categoryAffinities: ["packs"],
            priceSensitivity: "medium",
            purchaseCadence: "regular",
            churnRisk: "low",
            nextBestAction: "Offer a relevant bundle",
            evidence: ["orders:10"],
          },
          latencyMs: 120,
          experiment,
        }),
        { headers: { "x-tangle-model-cache": "hit" } },
      );
    }) as typeof fetch;
    const result = await executeBrowserPipeline(
      {
        name: "Buyer profiles",
        bindingCount: 4,
        tasks: [
          {
            id: "profiles",
            name: "Hosted profiles",
            componentId: "generate-buyer-profiles",
            arguments: { sample_size: "8" },
          },
        ],
      },
      buyerProfileCsv,
      { hostedProfileBaseUrl: "/api/buyer-profile", fetcher },
    );

    expect(result.kind).toBe("buyer-profiles");
    if (result.kind !== "buyer-profiles")
      throw new Error("Expected buyer-profile results");
    expect(result.profiles).toHaveLength(8);
    expect(result.cacheHits).toBe(8);
    expect(result.trainingExamples).toBe(1_440);
    expect(result.scorecard.student.judgeScore).toBeGreaterThan(
      result.scorecard.base.judgeScore,
    );
  });

  it("compares deterministic univariate and multivariate demand forecasts", async () => {
    const forecastPipeline: PipelineSnapshot = {
      name: "Retail demand forecast",
      bindingCount: 6,
      tasks: [
        {
          id: "univariate",
          name: "Sales history forecast",
          componentId: "univariate-forecast",
          arguments: {
            date_column: "date",
            target: "units_sold",
            lags: "1,7,14,28",
            horizon: "28",
          },
        },
        {
          id: "multivariate",
          name: "Retail drivers forecast",
          componentId: "multivariate-forecast",
          arguments: {
            date_column: "date",
            target: "units_sold",
            lags: "1,7,14,28",
            features: "avg_price,promotion,holiday,temperature,day_of_week",
            horizon: "28",
          },
        },
      ],
    };
    const first = await executeBrowserPipeline(forecastPipeline, dailySalesCsv);
    const second = await executeBrowserPipeline(
      forecastPipeline,
      dailySalesCsv,
    );

    expect(first.kind).toBe("forecasting");
    expect(second.kind).toBe("forecasting");
    if (first.kind !== "forecasting" || second.kind !== "forecasting")
      throw new Error("Expected forecasting results");
    expect(first.rowCount).toBe(730);
    expect(first.trainingRowCount).toBe(702);
    expect(first.horizon).toBe(28);
    expect(first.points).toHaveLength(28);
    expect(first.models).toHaveLength(2);
    expect(first.models.map((model) => model.metrics)).toEqual(
      second.models.map((model) => model.metrics),
    );
    expect(first.models.every((model) => model.metrics.mae > 0)).toBe(true);
    expect(
      first.models.find((model) => model.algorithm === "multivariate")?.metrics
        .mae,
    ).toBeLessThan(
      first.models.find((model) => model.algorithm === "univariate")?.metrics
        .mae ?? 0,
    );
    expect(first.improvement).toBeGreaterThan(0);
  });
});
