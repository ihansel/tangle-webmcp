export type CuratedComponentId =
  | "load-csv"
  | "select-columns"
  | "fill-missing"
  | "encode-categories"
  | "train-test-split"
  | "logistic-regression"
  | "decision-tree"
  | "evaluate"
  | "compare-metrics";

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

export interface BrowserRunResult {
  runId: string;
  seed: number;
  rowCount: number;
  trainRowCount: number;
  testRowCount: number;
  durationMs: number;
  models: BrowserModelResult[];
  preferredModelTaskId: string;
  preferredModelName: string;
  selectionReason: string;
}

export interface RunnerProgress {
  phase: "loading" | "preprocessing" | "training" | "evaluating";
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
