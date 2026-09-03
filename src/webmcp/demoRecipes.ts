import type { IconName } from "@/components/ui/icon";

import type { AddPipelineTasksInput } from "./WebMcpAdapter";

export type DemoRecipeId = "failure" | "churn" | "segments" | "embeddings";

export interface DemoRecipe {
  id: DemoRecipeId;
  title: string;
  shortTitle: string;
  description: string;
  outcome: string;
  eyebrow: string;
  icon: IconName;
  accent: "violet" | "mint" | "amber" | "sky";
  pipelineName: string;
  steps: string[];
  batch: AddPipelineTasksInput;
}

const classificationConnections: AddPipelineTasksInput["connections"] = [
  {
    sourceClientId: "load",
    sourcePort: "dataset",
    targetClientId: "select",
    targetPort: "dataset",
  },
  {
    sourceClientId: "select",
    sourcePort: "dataset",
    targetClientId: "fill",
    targetPort: "dataset",
  },
  {
    sourceClientId: "fill",
    sourcePort: "dataset",
    targetClientId: "encode",
    targetPort: "dataset",
  },
  {
    sourceClientId: "encode",
    sourcePort: "dataset",
    targetClientId: "split",
    targetPort: "dataset",
  },
  {
    sourceClientId: "split",
    sourcePort: "train",
    targetClientId: "logistic",
    targetPort: "train",
  },
  {
    sourceClientId: "split",
    sourcePort: "train",
    targetClientId: "tree",
    targetPort: "train",
  },
  {
    sourceClientId: "logistic",
    sourcePort: "model",
    targetClientId: "eval-logistic",
    targetPort: "model",
  },
  {
    sourceClientId: "split",
    sourcePort: "test",
    targetClientId: "eval-logistic",
    targetPort: "test",
  },
  {
    sourceClientId: "tree",
    sourcePort: "model",
    targetClientId: "eval-tree",
    targetPort: "model",
  },
  {
    sourceClientId: "split",
    sourcePort: "test",
    targetClientId: "eval-tree",
    targetPort: "test",
  },
  {
    sourceClientId: "eval-logistic",
    sourcePort: "metrics",
    targetClientId: "compare",
    targetPort: "logistic_metrics",
  },
  {
    sourceClientId: "eval-tree",
    sourcePort: "metrics",
    targetClientId: "compare",
    targetPort: "tree_metrics",
  },
];

function classificationBatch(kind: "failure" | "churn"): AddPipelineTasksInput {
  const churn = kind === "churn";
  const target = churn ? "churn" : "failure";
  return {
    tasks: [
      {
        clientId: "load",
        componentId: "load-csv",
        name: churn
          ? "Load customer subscriptions"
          : "Load equipment telemetry",
        configuration: {
          dataset_path: churn
            ? "/datasets/customer-churn.csv"
            : "/datasets/equipment-failure.csv",
        },
      },
      {
        clientId: "select",
        componentId: "select-columns",
        name: churn ? "Select retention signals" : "Select sensor columns",
        configuration: {
          columns: churn
            ? "tenure_months,monthly_spend,support_tickets,logins_30d,nps,contract_type,plan,region,churn"
            : "air_temperature,process_temperature,rotational_speed,torque,tool_wear,machine_type,failure",
        },
      },
      {
        clientId: "fill",
        componentId: "fill-missing",
        name: "Fill missing values",
      },
      {
        clientId: "encode",
        componentId: "encode-categories",
        name: churn ? "Encode customer attributes" : "Encode machine type",
        configuration: {
          columns: churn ? "contract_type,plan,region" : "machine_type",
        },
      },
      {
        clientId: "split",
        componentId: "train-test-split",
        name: "Deterministic 75/25 split",
        configuration: { target, seed: 42, test_ratio: 0.25 },
      },
      {
        clientId: "logistic",
        componentId: "logistic-regression",
        name: "Logistic regression",
      },
      {
        clientId: "tree",
        componentId: "decision-tree",
        name: "Small decision tree",
      },
      {
        clientId: "eval-logistic",
        componentId: "evaluate",
        name: "Evaluate logistic recall",
      },
      {
        clientId: "eval-tree",
        componentId: "evaluate",
        name: "Evaluate tree recall",
      },
      {
        clientId: "compare",
        componentId: "compare-metrics",
        name: "Compare recall",
      },
    ],
    connections: classificationConnections,
  };
}

export const DEMO_RECIPES: DemoRecipe[] = [
  {
    id: "failure",
    title: "Predict equipment failure",
    shortTitle: "Equipment failure",
    description:
      "Compare two classifiers on factory telemetry and optimise for the failures you cannot afford to miss.",
    outcome: "Decision tree · recall-first selection",
    eyebrow: "Predictive maintenance",
    icon: "Gauge",
    accent: "violet",
    pipelineName: "Equipment failure lab",
    steps: ["Load telemetry", "Train two models", "Compare recall"],
    batch: classificationBatch("failure"),
  },
  {
    id: "churn",
    title: "Find customers at risk of churn",
    shortTitle: "Churn radar",
    description:
      "Combine subscription behaviour and support signals to identify accounts that need attention early.",
    outcome: "Two models · retention-ready metrics",
    eyebrow: "Customer intelligence",
    icon: "UserRoundSearch",
    accent: "mint",
    pipelineName: "Customer churn radar",
    steps: ["Load accounts", "Encode behaviour", "Rank by recall"],
    batch: classificationBatch("churn"),
  },
  {
    id: "segments",
    title: "Segment customers by purchase behaviour",
    shortTitle: "Purchase segments",
    description:
      "Discover useful cohorts from order frequency, spend, basket size, discount use, and recency.",
    outcome: "4 segments · silhouette quality score",
    eyebrow: "Unsupervised learning",
    icon: "ChartScatter",
    accent: "amber",
    pipelineName: "Customer purchase segments",
    steps: ["Load purchases", "Run K-means", "Profile cohorts"],
    batch: {
      tasks: [
        {
          clientId: "load",
          componentId: "load-csv",
          name: "Load customer purchases",
          configuration: { dataset_path: "/datasets/customer-purchases.csv" },
        },
        {
          clientId: "select",
          componentId: "select-columns",
          name: "Select purchase signals",
          configuration: {
            columns:
              "customer_id,orders,spend,avg_basket,discount_share,days_since_order",
          },
        },
        {
          clientId: "fill",
          componentId: "fill-missing",
          name: "Fill missing purchase values",
        },
        {
          clientId: "cluster",
          componentId: "k-means",
          name: "Find four customer segments",
          configuration: {
            features: "orders,spend,avg_basket,discount_share,days_since_order",
            clusters: 4,
            seed: 42,
          },
        },
        {
          clientId: "profile",
          componentId: "profile-clusters",
          name: "Profile customer segments",
        },
      ],
      connections: [
        {
          sourceClientId: "load",
          sourcePort: "dataset",
          targetClientId: "select",
          targetPort: "dataset",
        },
        {
          sourceClientId: "select",
          sourcePort: "dataset",
          targetClientId: "fill",
          targetPort: "dataset",
        },
        {
          sourceClientId: "fill",
          sourcePort: "dataset",
          targetClientId: "cluster",
          targetPort: "dataset",
        },
        {
          sourceClientId: "cluster",
          sourcePort: "segments",
          targetClientId: "profile",
          targetPort: "segments",
        },
      ],
    },
  },
  {
    id: "embeddings",
    title: "Embed a product catalogue",
    shortTitle: "SKU embeddings",
    description:
      "Turn catalogue text into local vectors and surface semantic product neighbours without an external API.",
    outcome: "24 dimensions · cosine neighbours",
    eyebrow: "Vector similarity",
    icon: "Boxes",
    accent: "sky",
    pipelineName: "Product SKU embeddings",
    steps: ["Load catalogue", "Create vectors", "Find neighbours"],
    batch: {
      tasks: [
        {
          clientId: "load",
          componentId: "load-csv",
          name: "Load product catalogue",
          configuration: { dataset_path: "/datasets/product-catalog.csv" },
        },
        {
          clientId: "embed",
          componentId: "text-embedding",
          name: "Embed product text",
          configuration: {
            id_column: "sku",
            text_columns: "name,category,description",
            dimensions: 24,
          },
        },
        {
          clientId: "neighbors",
          componentId: "nearest-neighbors",
          name: "Find semantic neighbours",
        },
      ],
      connections: [
        {
          sourceClientId: "load",
          sourcePort: "dataset",
          targetClientId: "embed",
          targetPort: "dataset",
        },
        {
          sourceClientId: "embed",
          sourcePort: "vectors",
          targetClientId: "neighbors",
          targetPort: "vectors",
        },
      ],
    },
  },
];

export const DEMO_RECIPE_BY_ID = new Map(
  DEMO_RECIPES.map((recipe) => [recipe.id, recipe]),
);
