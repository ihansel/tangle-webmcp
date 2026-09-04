import type { IconName } from "@/components/ui/icon";

import type { AddPipelineTasksInput } from "./WebMcpAdapter";

export type DemoRecipeId =
  | "failure"
  | "churn"
  | "forecast"
  | "segments"
  | "embeddings"
  | "profiles"
  | "fine-tune";

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
  const target = churn ? "churned" : "failure";
  return {
    tasks: [
      {
        clientId: "load",
        componentId: "load-csv",
        name: churn ? "Load Northstar customers" : "Load equipment telemetry",
        configuration: {
          dataset_path: churn
            ? "/datasets/northstar-commerce/customers.csv"
            : "/datasets/equipment-failure.csv",
        },
      },
      {
        clientId: "select",
        componentId: "select-columns",
        name: churn ? "Select retention signals" : "Select sensor columns",
        configuration: {
          columns: churn
            ? "customer_id,region,acquisition_channel,membership_tier,preferred_category,tenure_months,orders,spend,avg_basket,discount_share,return_rate,support_tickets,days_since_order,email_engagement,satisfaction_score,lifetime_value,churned,latent_segment,recommended_action"
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
          columns: churn
            ? "region,acquisition_channel,membership_tier,preferred_category"
            : "machine_type",
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
    id: "profiles",
    title: "Turn purchase history into buyer profiles",
    shortTitle: "Buyer profile model",
    description:
      "Use a fine-tuned small language model to turn shopping timelines into grounded customer summaries and next actions.",
    outcome: "Profile cards · model scorecard · difficult slices",
    eyebrow: "Small-model fine-tuning",
    icon: "BrainCircuit",
    accent: "mint",
    pipelineName: "Buyer profile fine-tuning lab",
    steps: ["Build timelines", "Run the 0.8B model", "Audit the evidence"],
    batch: {
      tasks: [
        {
          clientId: "load",
          componentId: "load-csv",
          name: "Load synthetic customer histories",
          configuration: {
            dataset_path: "/datasets/northstar-commerce/buyer-profiles.csv",
          },
        },
        {
          clientId: "timeline",
          componentId: "build-profile-timeline",
          name: "Build compact purchase timelines",
        },
        {
          clientId: "profile",
          componentId: "generate-buyer-profiles",
          name: "Run fine-tuned Qwen3.5-0.8B",
          configuration: {
            sample_size: 8,
            runtime: "Modal L4 · hosted",
          },
        },
        {
          clientId: "validate",
          componentId: "validate-buyer-profiles",
          name: "Check schema and cited evidence",
        },
        {
          clientId: "evaluate",
          componentId: "evaluate-buyer-profiles",
          name: "Compare base and fine-tuned model",
        },
      ],
      connections: [
        {
          sourceClientId: "load",
          sourcePort: "dataset",
          targetClientId: "timeline",
          targetPort: "dataset",
        },
        {
          sourceClientId: "timeline",
          sourcePort: "timelines",
          targetClientId: "profile",
          targetPort: "timelines",
        },
        {
          sourceClientId: "profile",
          sourcePort: "profiles",
          targetClientId: "validate",
          targetPort: "profiles",
        },
        {
          sourceClientId: "validate",
          sourcePort: "profiles",
          targetClientId: "evaluate",
          targetPort: "profiles",
        },
        {
          sourceClientId: "load",
          sourcePort: "dataset",
          targetClientId: "evaluate",
          targetPort: "dataset",
        },
      ],
    },
  },
  {
    id: "fine-tune",
    title: "Fine-tune and deploy a buyer profile model",
    shortTitle: "Fine-tuning workflow",
    description:
      "Replay the completed Modal run from teacher-data generation through LoRA training, held-out checks, deployment and live profiles.",
    outcome: "19-minute reference run · 96.8 score · protected endpoint",
    eyebrow: "Hosted training",
    icon: "CloudCog",
    accent: "sky",
    pipelineName: "Buyer profile training workflow",
    steps: [
      "Generate teacher data",
      "Fine-tune on H100",
      "Evaluate and deploy",
    ],
    batch: {
      tasks: [
        {
          clientId: "load",
          componentId: "load-csv",
          name: "Load synthetic customer histories",
          configuration: {
            dataset_path: "/datasets/northstar-commerce/buyer-profiles.csv",
          },
        },
        {
          clientId: "timeline",
          componentId: "build-profile-timeline",
          name: "Build compact purchase timelines",
        },
        {
          clientId: "teacher",
          componentId: "generate-profile-training-data",
          name: "Generate 960 teacher profiles",
          configuration: {
            sample_count: 960,
            teacher_model: "Qwen3.5-4B",
          },
        },
        {
          clientId: "tune",
          componentId: "fine-tune-profile-model",
          name: "Fine-tune Qwen3.5-0.8B with LoRA",
          configuration: {
            base_model: "Qwen3.5-0.8B",
            max_steps: 300,
            gpu: "H100",
          },
        },
        {
          clientId: "evaluate",
          componentId: "evaluate-profile-model",
          name: "Evaluate 80 unseen customers",
        },
        {
          clientId: "publish",
          componentId: "publish-profile-endpoint",
          name: "Publish protected Modal endpoint",
        },
        {
          clientId: "profile",
          componentId: "generate-buyer-profiles",
          name: "Run eight approved profiles",
          configuration: {
            sample_size: 8,
            runtime: "Modal L4 · protected",
          },
        },
        {
          clientId: "validate",
          componentId: "validate-buyer-profiles",
          name: "Verify schema and citations",
        },
      ],
      connections: [
        {
          sourceClientId: "load",
          sourcePort: "dataset",
          targetClientId: "timeline",
          targetPort: "dataset",
        },
        {
          sourceClientId: "timeline",
          sourcePort: "timelines",
          targetClientId: "teacher",
          targetPort: "timelines",
        },
        {
          sourceClientId: "teacher",
          sourcePort: "training_set",
          targetClientId: "tune",
          targetPort: "training_set",
        },
        {
          sourceClientId: "tune",
          sourcePort: "model",
          targetClientId: "evaluate",
          targetPort: "model",
        },
        {
          sourceClientId: "load",
          sourcePort: "dataset",
          targetClientId: "evaluate",
          targetPort: "dataset",
        },
        {
          sourceClientId: "tune",
          sourcePort: "model",
          targetClientId: "publish",
          targetPort: "model",
        },
        {
          sourceClientId: "evaluate",
          sourcePort: "evaluation",
          targetClientId: "publish",
          targetPort: "evaluation",
        },
        {
          sourceClientId: "timeline",
          sourcePort: "timelines",
          targetClientId: "profile",
          targetPort: "timelines",
        },
        {
          sourceClientId: "publish",
          sourcePort: "endpoint",
          targetClientId: "profile",
          targetPort: "endpoint",
        },
        {
          sourceClientId: "profile",
          sourcePort: "profiles",
          targetClientId: "validate",
          targetPort: "profiles",
        },
      ],
    },
  },
  {
    id: "churn",
    title: "Spot customers who may leave",
    shortTitle: "Churn prediction",
    description:
      "Compare two prediction methods using shopping, loyalty, service and engagement signals from 1,800 customers.",
    outcome: "Risk groups · key reasons · who to contact",
    eyebrow: "Prediction",
    icon: "UserRoundSearch",
    accent: "mint",
    pipelineName: "Customer churn radar",
    steps: ["Load customers", "Compare predictions", "Review who needs help"],
    batch: classificationBatch("churn"),
  },
  {
    id: "segments",
    title: "Group customers by shopping behaviour",
    shortTitle: "Customer groups",
    description:
      "Find useful groups across 1,800 customers using spend, frequency, recent orders, returns and engagement.",
    outcome: "Customer map · group profiles · next steps",
    eyebrow: "Customer grouping",
    icon: "ChartScatter",
    accent: "amber",
    pipelineName: "Customer purchase segments",
    steps: ["Load purchases", "Find similar shoppers", "Name each group"],
    batch: {
      tasks: [
        {
          clientId: "load",
          componentId: "load-csv",
          name: "Load customer purchases",
          configuration: {
            dataset_path: "/datasets/northstar-commerce/customers.csv",
          },
        },
        {
          clientId: "select",
          componentId: "select-columns",
          name: "Select purchase signals",
          configuration: {
            columns:
              "customer_id,orders,spend,avg_basket,discount_share,return_rate,days_since_order,email_engagement,lifetime_value,latent_segment,recommended_action",
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
          name: "Group similar customers",
          configuration: {
            features:
              "orders,spend,avg_basket,discount_share,return_rate,days_since_order,email_engagement",
            clusters: 4,
            seed: 42,
          },
        },
        {
          clientId: "profile",
          componentId: "profile-clusters",
          name: "Describe each customer group",
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
    id: "forecast",
    title: "Forecast daily product demand",
    shortTitle: "Demand forecasting",
    description:
      "Compare a sales-history forecast with one that also knows about price, promotions, holidays and weather.",
    outcome: "28-day outlook · error comparison · demand chart",
    eyebrow: "Forecasting",
    icon: "ChartNoAxesCombined",
    accent: "violet",
    pipelineName: "Retail demand forecast",
    steps: ["Load daily sales", "Build two forecasts", "Compare accuracy"],
    batch: {
      tasks: [
        {
          clientId: "load",
          componentId: "load-csv",
          name: "Load daily retail sales",
          configuration: {
            dataset_path: "/datasets/northstar-commerce/daily-sales.csv",
          },
        },
        {
          clientId: "select",
          componentId: "select-columns",
          name: "Select demand signals",
          configuration: {
            columns:
              "date,units_sold,orders,revenue,avg_price,promotion,holiday,temperature,day_of_week",
          },
        },
        {
          clientId: "fill",
          componentId: "fill-missing",
          name: "Fill missing daily values",
        },
        {
          clientId: "univariate",
          componentId: "univariate-forecast",
          name: "Forecast from sales history",
          configuration: {
            date_column: "date",
            target: "units_sold",
            lags: "1,7,14,28",
            horizon: 28,
          },
        },
        {
          clientId: "multivariate",
          componentId: "multivariate-forecast",
          name: "Forecast with retail drivers",
          configuration: {
            date_column: "date",
            target: "units_sold",
            lags: "1,7,14,28",
            features: "avg_price,promotion,holiday,temperature,day_of_week",
            horizon: 28,
          },
        },
        {
          clientId: "compare",
          componentId: "compare-forecasts",
          name: "Compare forecast accuracy",
          configuration: { priority: "mae" },
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
          targetClientId: "univariate",
          targetPort: "dataset",
        },
        {
          sourceClientId: "fill",
          sourcePort: "dataset",
          targetClientId: "multivariate",
          targetPort: "dataset",
        },
        {
          sourceClientId: "univariate",
          sourcePort: "forecast",
          targetClientId: "compare",
          targetPort: "univariate",
        },
        {
          sourceClientId: "multivariate",
          sourcePort: "forecast",
          targetClientId: "compare",
          targetPort: "multivariate",
        },
      ],
    },
  },
  {
    id: "embeddings",
    title: "Find products that belong together",
    shortTitle: "Product relationships",
    description:
      "Learn which products are bought together, then find similar items and useful bundle ideas.",
    outcome: "Product map · similar items · bundle ideas",
    eyebrow: "Product matching",
    icon: "Boxes",
    accent: "sky",
    pipelineName: "Product SKU embeddings",
    steps: ["Load products", "Learn purchase patterns", "Find similar items"],
    batch: {
      tasks: [
        {
          clientId: "load",
          componentId: "load-csv",
          name: "Load product catalogue",
          configuration: {
            dataset_path: "/datasets/northstar-commerce/products.csv",
          },
        },
        {
          clientId: "embed",
          componentId: "product2vec",
          name: "Learn product relationships",
          configuration: {
            id_column: "sku",
            context_column: "copurchase_skus",
            dimensions: 16,
            epochs: 80,
            learning_rate: 0.04,
            negative_samples: 4,
            seed: 42,
          },
        },
        {
          clientId: "neighbors",
          componentId: "nearest-neighbors",
          name: "Find similar products",
          configuration: { neighbors: 3 },
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

export const RETAIL_DEMO_RECIPES = DEMO_RECIPES.filter(
  (recipe) => recipe.id !== "failure",
);
