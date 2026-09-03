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
}

export interface ClusterProfile {
  cluster: number;
  size: number;
  share: number;
  label: string;
  summary: string;
}

export interface ClusteringRunResult extends BrowserRunBase {
  kind: "clustering";
  clusterCount: number;
  silhouetteScore: number;
  clusters: ClusterProfile[];
  insight: string;
}

export interface NeighborMatch {
  item: string;
  match: string;
  similarity: number;
}

export interface EmbeddingRunResult extends BrowserRunBase {
  kind: "embedding";
  dimensions: number;
  vocabularySize: number;
  neighbors: NeighborMatch[];
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
