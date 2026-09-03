export type CuratedComponentId =
  | "load-csv"
  | "select-columns"
  | "fill-missing"
  | "encode-categories"
  | "train-test-split"
  | "logistic-regression"
  | "decision-tree"
  | "evaluate"
  | "compare-metrics"
  | "k-means"
  | "profile-clusters"
  | "text-embedding"
  | "product2vec"
  | "nearest-neighbors";

export interface BrowserMetricSet {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
  };
}

export interface BrowserModelResult {
  taskId: string;
  taskName: string;
  algorithm: "logistic-regression" | "decision-tree";
  metrics: BrowserMetricSet;
}

interface BrowserRunBase {
  runId: string;
  seed: number;
  rowCount: number;
  durationMs: number;
}

export interface ClassificationRunResult extends BrowserRunBase {
  kind: "classification";
  trainRowCount: number;
  testRowCount: number;
  models: BrowserModelResult[];
  preferredModelTaskId: string;
  preferredModelName: string;
  selectionReason: string;
  thresholdCurve: Array<{
    threshold: number;
    precision: number;
    recall: number;
    f1: number;
  }>;
  riskDistribution: Array<{
    label: string;
    count: number;
    churnRate: number;
  }>;
  featureDrivers: Array<{
    feature: string;
    importance: number;
    direction: "increases" | "decreases";
  }>;
  highRiskCustomers: Array<{
    customerId: string;
    risk: number;
    lifetimeValue: number;
    segment: string;
    action: string;
  }>;
  interventionCurve: Array<{
    customers: number;
    revenueSaved: number;
    cost: number;
    netValue: number;
  }>;
}

export interface ClusterProfile {
  cluster: number;
  size: number;
  share: number;
  label: string;
  summary: string;
  revenueShare: number;
  action: string;
  examples: Array<{
    customerId: string;
    lifetimeValue: number;
    orders: number;
    daysSinceOrder: number;
  }>;
}

export interface ClusterPoint {
  customerId: string;
  cluster: number;
  x: number;
  y: number;
}

export interface ClusteringRunResult extends BrowserRunBase {
  kind: "clustering";
  clusterCount: number;
  silhouetteScore: number;
  clusters: ClusterProfile[];
  featureNames: string[];
  centroids: Array<{ cluster: number; values: number[] }>;
  points: ClusterPoint[];
  insight: string;
}

export interface NeighborMatch {
  item: string;
  match: string;
  similarity: number;
}

export interface ProductNeighborGroup {
  sku: string;
  name: string;
  category: string;
  neighbors: Array<{ sku: string; name: string; similarity: number }>;
}

export interface EmbeddingPoint {
  sku: string;
  name: string;
  category: string;
  x: number;
  y: number;
}

export interface EmbeddingRunResult extends BrowserRunBase {
  kind: "embedding";
  algorithm: "tf-idf" | "product2vec";
  dimensions: number;
  vocabularySize: number;
  training: {
    epochs: number;
    pairCount: number;
    negativeSamples: number;
    initialLoss: number;
    finalLoss: number;
    contextSimilarity: number;
    baselineSimilarity: number;
    lossCurve: Array<{ epoch: number; loss: number }>;
  } | null;
  neighbors: NeighborMatch[];
  products: ProductNeighborGroup[];
  points: EmbeddingPoint[];
  similarityMatrix: {
    labels: string[];
    values: number[][];
  };
  categoryCohesion: Array<{
    category: string;
    score: number;
    productCount: number;
  }>;
  coPurchaseLinks: Array<{
    source: string;
    target: string;
    strength: number;
  }>;
  unexpectedPairs: Array<{
    source: string;
    sourceName: string;
    target: string;
    targetName: string;
    similarity: number;
  }>;
  insight: string;
}

export type BrowserRunResult =
  ClassificationRunResult | ClusteringRunResult | EmbeddingRunResult;

export interface RunnerProgress {
  phase:
    | "loading"
    | "preprocessing"
    | "training"
    | "evaluating"
    | "clustering"
    | "embedding";
  percent: number;
  message: string;
}

export interface PipelineTaskSnapshot {
  id: string;
  name: string;
  componentId: CuratedComponentId | null;
  arguments: Record<string, unknown>;
}

export interface PipelineSnapshot {
  name: string;
  tasks: PipelineTaskSnapshot[];
  bindingCount: number;
}
