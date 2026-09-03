import type { AddPipelineTasksInput } from "./WebMcpAdapter";

export const FAILURE_DEMO_BATCH: AddPipelineTasksInput = {
  tasks: [
    {
      clientId: "load",
      componentId: "load-csv",
      name: "Load equipment failures",
    },
    {
      clientId: "select",
      componentId: "select-columns",
      name: "Select sensor columns",
    },
    {
      clientId: "fill",
      componentId: "fill-missing",
      name: "Fill missing sensor values",
    },
    {
      clientId: "encode",
      componentId: "encode-categories",
      name: "Encode machine type",
    },
    {
      clientId: "split",
      componentId: "train-test-split",
      name: "Deterministic 75/25 split",
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
  ],
};
