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
  | "nearest-neighbors"
  | "univariate-forecast"
  | "multivariate-forecast"
  | "compare-forecasts"
  | "build-profile-timeline"
  | "generate-buyer-profiles"
  | "validate-buyer-profiles"
  | "evaluate-buyer-profiles";

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

export interface ForecastMetricSet {
  mae: number;
  rmse: number;
  mape: number;
}

export interface ForecastModelResult {
  taskId: string;
  taskName: string;
  algorithm: "univariate" | "multivariate";
  metrics: ForecastMetricSet;
  driverNames: string[];
}

export interface ForecastPoint {
  date: string;
  actual: number;
  univariate: number | null;
  multivariate: number | null;
}

export interface ForecastingRunResult extends BrowserRunBase {
  kind: "forecasting";
  dateColumn: string;
  targetColumn: string;
  trainingRowCount: number;
  horizon: number;
  models: ForecastModelResult[];
  preferredModelTaskId: string;
  preferredModelName: string;
  selectionReason: string;
  points: ForecastPoint[];
  improvement: number;
  insight: string;
}

export interface BuyerProfilePrediction {
  customerId: string;
  valid: boolean;
  summary: string;
  lifecycleStage: string;
  categoryAffinities: string[];
  priceSensitivity: string;
  purchaseCadence: string;
  churnRisk: string;
  nextBestAction: string;
  evidence: string[];
  latencyMs: number;
}

export interface BuyerProfileScore {
  name: string;
  schemaValidity: number;
  labelAccuracy: number;
  evidenceGrounding: number;
  judgeScore: number;
}

export interface BuyerProfileRunResult extends BrowserRunBase {
  kind: "buyer-profiles";
  model: string;
  teacherModel: string;
  adapterVersion: string;
  trainingExamples: number;
  evaluationExamples: number;
  generationMinutes: number;
  trainingMinutes: number;
  maxSteps: number;
  profilesPerSecond: number;
  profiles: BuyerProfilePrediction[];
  scorecard: {
    teacher: BuyerProfileScore;
    base: BuyerProfileScore;
    student: BuyerProfileScore;
  };
  lossCurve: Array<{ step: number; loss: number }>;
  slices: Array<{
    label: string;
    count: number;
    baseScore: number;
    studentScore: number;
  }>;
  cacheHits: number;
  insight: string;
}

export type BrowserRunResult =
  | ClassificationRunResult
  | ClusteringRunResult
  | EmbeddingRunResult
  | ForecastingRunResult
  | BuyerProfileRunResult;

export interface RunnerProgress {
  phase:
    | "loading"
    | "preprocessing"
    | "training"
    | "evaluating"
    | "clustering"
    | "embedding"
    | "forecasting"
    | "profiling";
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
