import type { ComponentReference } from "@/models/componentSpec";
import type { InputSpec, OutputSpec } from "@/utils/componentSpec";

import type { CuratedComponentId } from "./types";

export const BROWSER_EXECUTABLE_ANNOTATION = "browser.webmcp.dev/executable";
export const COMPONENT_ID_ANNOTATION = "browser.webmcp.dev/component-id";

export interface CuratedComponent {
  id: CuratedComponentId;
  name: string;
  description: string;
  category:
    | "data"
    | "preprocess"
    | "training"
    | "evaluation"
    | "segmentation"
    | "embeddings"
    | "forecasting";
  inputs: InputSpec[];
  outputs: OutputSpec[];
}

const components: CuratedComponent[] = [
  {
    id: "load-csv",
    name: "Load local CSV",
    description:
      "Load one of the bundled privacy-safe datasets locally in the browser.",
    category: "data",
    inputs: [
      {
        name: "dataset_path",
        type: "String",
        default: "/datasets/equipment-failure.csv",
      },
    ],
    outputs: [{ name: "dataset", type: "DataFrame" }],
  },
  {
    id: "select-columns",
    name: "Select columns",
    description: "Keep the selected feature and target columns.",
    category: "preprocess",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      {
        name: "columns",
        type: "String",
        default:
          "air_temperature,process_temperature,rotational_speed,torque,tool_wear,machine_type,failure",
      },
    ],
    outputs: [{ name: "dataset", type: "DataFrame" }],
  },
  {
    id: "fill-missing",
    name: "Fill missing values",
    description:
      "Fill missing numeric values with the median and categorical values with the mode.",
    category: "preprocess",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      { name: "strategy", type: "String", default: "median" },
    ],
    outputs: [{ name: "dataset", type: "DataFrame" }],
  },
  {
    id: "encode-categories",
    name: "Encode categories",
    description: "One-hot encode the selected categorical columns.",
    category: "preprocess",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      { name: "columns", type: "String", default: "machine_type" },
    ],
    outputs: [{ name: "dataset", type: "DataFrame" }],
  },
  {
    id: "train-test-split",
    name: "Train/test split",
    description: "Create a deterministic stratified training and test split.",
    category: "preprocess",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      { name: "target", type: "String", default: "failure" },
      { name: "test_ratio", type: "Float", default: "0.25" },
      { name: "seed", type: "Integer", default: "42" },
    ],
    outputs: [
      { name: "train", type: "DataFrame" },
      { name: "test", type: "DataFrame" },
    ],
  },
  {
    id: "logistic-regression",
    name: "Logistic regression",
    description: "Train a deterministic binary logistic regression classifier.",
    category: "training",
    inputs: [
      { name: "train", type: "DataFrame" },
      { name: "target", type: "String", default: "failure" },
      { name: "iterations", type: "Integer", default: "800" },
      { name: "learning_rate", type: "Float", default: "0.1" },
    ],
    outputs: [{ name: "model", type: "Model" }],
  },
  {
    id: "decision-tree",
    name: "Decision tree",
    description:
      "Train a small deterministic CART-style decision tree classifier.",
    category: "training",
    inputs: [
      { name: "train", type: "DataFrame" },
      { name: "target", type: "String", default: "failure" },
      { name: "max_depth", type: "Integer", default: "4" },
      { name: "min_samples", type: "Integer", default: "3" },
    ],
    outputs: [{ name: "model", type: "Model" }],
  },
  {
    id: "evaluate",
    name: "Evaluate classifier",
    description:
      "Calculate bounded binary-classification metrics with recall highlighted.",
    category: "evaluation",
    inputs: [
      { name: "model", type: "Model" },
      { name: "test", type: "DataFrame" },
      { name: "target", type: "String", default: "failure" },
    ],
    outputs: [{ name: "metrics", type: "Metrics" }],
  },
  {
    id: "compare-metrics",
    name: "Compare & visualise",
    description:
      "Compare model metrics and recommend the model with the strongest recall.",
    category: "evaluation",
    inputs: [
      { name: "logistic_metrics", type: "Metrics" },
      { name: "tree_metrics", type: "Metrics" },
      { name: "priority", type: "String", default: "recall" },
    ],
    outputs: [{ name: "report", type: "Report" }],
  },
  {
    id: "k-means",
    name: "K-means segmentation",
    description:
      "Standardise numeric purchase features and find deterministic customer segments locally.",
    category: "segmentation",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      {
        name: "features",
        type: "String",
        default:
          "orders,spend,avg_basket,discount_share,return_rate,days_since_order,email_engagement",
      },
      { name: "clusters", type: "Integer", default: "4" },
      { name: "seed", type: "Integer", default: "42" },
    ],
    outputs: [{ name: "segments", type: "Clusters" }],
  },
  {
    id: "profile-clusters",
    name: "Profile customer segments",
    description:
      "Turn cluster centroids into concise, useful customer segment profiles.",
    category: "segmentation",
    inputs: [
      { name: "segments", type: "Clusters" },
      { name: "label_column", type: "String", default: "customer_id" },
    ],
    outputs: [{ name: "report", type: "Report" }],
  },
  {
    id: "text-embedding",
    name: "Embed product catalogue",
    description:
      "Create deterministic TF-IDF product vectors locally from SKU names, categories, and descriptions.",
    category: "embeddings",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      { name: "id_column", type: "String", default: "sku" },
      {
        name: "text_columns",
        type: "String",
        default: "name,category,description",
      },
      { name: "dimensions", type: "Integer", default: "32" },
    ],
    outputs: [{ name: "vectors", type: "Embeddings" }],
  },
  {
    id: "product2vec",
    name: "Train Product2Vec",
    description:
      "Train a compact skip-gram embedding model locally from SKU co-purchase context.",
    category: "embeddings",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      { name: "id_column", type: "String", default: "sku" },
      {
        name: "context_column",
        type: "String",
        default: "copurchase_skus",
      },
      { name: "dimensions", type: "Integer", default: "16" },
      { name: "epochs", type: "Integer", default: "80" },
      { name: "learning_rate", type: "Float", default: "0.04" },
      { name: "negative_samples", type: "Integer", default: "4" },
      { name: "seed", type: "Integer", default: "42" },
    ],
    outputs: [{ name: "vectors", type: "Embeddings" }],
  },
  {
    id: "nearest-neighbors",
    name: "Find similar products",
    description:
      "Use cosine similarity to surface nearest product neighbours from local embeddings.",
    category: "embeddings",
    inputs: [
      { name: "vectors", type: "Embeddings" },
      { name: "neighbors", type: "Integer", default: "3" },
    ],
    outputs: [{ name: "matches", type: "Report" }],
  },
  {
    id: "univariate-forecast",
    name: "Forecast from sales history",
    description:
      "Forecast one numeric series locally using only its own recent history.",
    category: "forecasting",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      { name: "date_column", type: "String", default: "date" },
      { name: "target", type: "String", default: "units_sold" },
      { name: "lags", type: "String", default: "1,7,14,28" },
      { name: "horizon", type: "Integer", default: "28" },
    ],
    outputs: [{ name: "forecast", type: "Forecast" }],
  },
  {
    id: "multivariate-forecast",
    name: "Forecast with known drivers",
    description:
      "Forecast a numeric series locally using its history plus known inputs such as price, promotions and holidays.",
    category: "forecasting",
    inputs: [
      { name: "dataset", type: "DataFrame" },
      { name: "date_column", type: "String", default: "date" },
      { name: "target", type: "String", default: "units_sold" },
      { name: "lags", type: "String", default: "1,7,14,28" },
      {
        name: "features",
        type: "String",
        default: "avg_price,promotion,holiday,temperature",
      },
      { name: "horizon", type: "Integer", default: "28" },
    ],
    outputs: [{ name: "forecast", type: "Forecast" }],
  },
  {
    id: "compare-forecasts",
    name: "Compare forecasts",
    description:
      "Compare forecast errors and present the strongest approach in a readable report.",
    category: "evaluation",
    inputs: [
      { name: "univariate", type: "Forecast" },
      { name: "multivariate", type: "Forecast" },
      { name: "priority", type: "String", default: "mae" },
    ],
    outputs: [{ name: "report", type: "Report" }],
  },
];

export const CURATED_COMPONENTS = components;

export const CURATED_COMPONENT_BY_ID = new Map(
  components.map((component) => [component.id, component]),
);

export function createCuratedComponentReference(
  component: CuratedComponent,
): ComponentReference {
  return {
    name: component.name,
    url: `webmcp://components/${component.id}`,
    spec: {
      name: component.name,
      description: component.description,
      inputs: component.inputs,
      outputs: component.outputs,
      implementation: {
        container: { image: `webmcp-browser/${component.id}:1` },
      },
      metadata: {
        annotations: {
          [BROWSER_EXECUTABLE_ANNOTATION]: true,
          [COMPONENT_ID_ANNOTATION]: component.id,
        },
      },
    },
  };
}

export function componentIdFromUrl(
  url: string | undefined,
): CuratedComponentId | null {
  const prefix = "webmcp://components/";
  if (!url?.startsWith(prefix)) return null;
  const candidate = url.slice(prefix.length) as CuratedComponentId;
  return CURATED_COMPONENT_BY_ID.has(candidate) ? candidate : null;
}
