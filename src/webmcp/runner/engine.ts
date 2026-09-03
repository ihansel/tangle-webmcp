import type {
  BrowserMetricSet,
  BrowserModelResult,
  BrowserRunResult,
  PipelineSnapshot,
  RunnerProgress,
} from "../types";

interface EncodedDataset {
  features: number[][];
  labels: number[];
}

interface TreeNode {
  prediction: number;
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface EngineOptions {
  signal?: AbortSignal;
  onProgress?: (progress: RunnerProgress) => void;
}

const MAX_ROWS = 2_000;
const MAX_COLUMNS = 32;

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new DOMException("Browser run cancelled", "AbortError");
}

function progress(
  options: EngineOptions,
  phase: RunnerProgress["phase"],
  percent: number,
  message: string,
) {
  options.onProgress?.({ phase, percent, message });
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 3)
    throw new Error("Dataset must contain a header and at least two rows.");
  if (lines.length - 1 > MAX_ROWS) {
    throw new Error(`Dataset exceeds the ${MAX_ROWS}-row browser limit.`);
  }
  const headers = lines[0].split(",").map((value) => value.trim());
  if (headers.length > MAX_COLUMNS) {
    throw new Error(`Dataset exceeds the ${MAX_COLUMNS}-column browser limit.`);
  }
  return lines.slice(1).map((line, rowIndex) => {
    const values = line.split(",").map((value) => value.trim());
    if (values.length !== headers.length) {
      throw new Error(
        `Row ${rowIndex + 2} has ${values.length} values; expected ${headers.length}.`,
      );
    }
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]]),
    );
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function encodeDataset(rows: Array<Record<string, string>>): EncodedDataset {
  const target = "failure";
  const categorical = "machine_type";
  const ignored = new Set(["machine_id", target, categorical]);
  const numericColumns = Object.keys(rows[0]).filter(
    (column) => !ignored.has(column),
  );
  const categories = [
    ...new Set(rows.map((row) => row[categorical] || "M")),
  ].sort();
  const medians = Object.fromEntries(
    numericColumns.map((column) => {
      const present = rows
        .map((row) => Number(row[column]))
        .filter((value) => Number.isFinite(value));
      if (present.length === 0)
        throw new Error(`Column ${column} has no numeric values.`);
      return [column, median(present)];
    }),
  );

  const rawFeatures = rows.map((row) => [
    ...numericColumns.map((column) => {
      const parsed = Number(row[column]);
      return Number.isFinite(parsed) ? parsed : medians[column];
    }),
    ...categories.map((category) =>
      Number((row[categorical] || "M") === category),
    ),
  ]);
  const means = rawFeatures[0].map(
    (_, feature) =>
      rawFeatures.reduce((sum, row) => sum + row[feature], 0) /
      rawFeatures.length,
  );
  const deviations = means.map((mean, feature) => {
    const variance =
      rawFeatures.reduce((sum, row) => sum + (row[feature] - mean) ** 2, 0) /
      rawFeatures.length;
    return Math.sqrt(variance) || 1;
  });

  return {
    features: rawFeatures.map((row) =>
      row.map(
        (value, feature) => (value - means[feature]) / deviations[feature],
      ),
    ),
    labels: rows.map((row) => (row[target] === "1" ? 1 : 0)),
  };
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function stratifiedSplit(
  dataset: EncodedDataset,
  testRatio: number,
  seed: number,
) {
  const random = seededRandom(seed);
  const byLabel = [0, 1].map((label) =>
    dataset.labels
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value === label)
      .map((item) => item.index),
  );
  for (const indices of byLabel) {
    for (let index = indices.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [indices[index], indices[other]] = [indices[other], indices[index]];
    }
  }
  const testIndices = new Set(
    byLabel.flatMap((indices) =>
      indices.slice(0, Math.max(1, Math.round(indices.length * testRatio))),
    ),
  );
  const project = (indices: number[]) => ({
    features: indices.map((index) => dataset.features[index]),
    labels: indices.map((index) => dataset.labels[index]),
  });
  const all = dataset.labels.map((_, index) => index);
  return {
    train: project(all.filter((index) => !testIndices.has(index))),
    test: project(all.filter((index) => testIndices.has(index))),
  };
}

function sigmoid(value: number) {
  const clipped = Math.max(-30, Math.min(30, value));
  return 1 / (1 + Math.exp(-clipped));
}

function trainLogisticRegression(
  dataset: EncodedDataset,
  iterations: number,
  learningRate: number,
  signal?: AbortSignal,
) {
  const weights = new Array(dataset.features[0].length).fill(0);
  let bias = 0;
  for (let iteration = 0; iteration < iterations; iteration++) {
    if (iteration % 25 === 0) throwIfAborted(signal);
    const gradient = new Array(weights.length).fill(0);
    let biasGradient = 0;
    for (let row = 0; row < dataset.features.length; row++) {
      const score = dataset.features[row].reduce(
        (sum, value, feature) => sum + value * weights[feature],
        bias,
      );
      const error = sigmoid(score) - dataset.labels[row];
      for (let feature = 0; feature < weights.length; feature++) {
        gradient[feature] += error * dataset.features[row][feature];
      }
      biasGradient += error;
    }
    for (let feature = 0; feature < weights.length; feature++) {
      weights[feature] -=
        (learningRate * gradient[feature]) / dataset.features.length;
    }
    bias -= (learningRate * biasGradient) / dataset.features.length;
  }
  return (features: number[]) =>
    Number(
      sigmoid(
        features.reduce(
          (sum, value, feature) => sum + value * weights[feature],
          bias,
        ),
      ) >= 0.42,
    );
}

function gini(labels: number[]): number {
  if (labels.length === 0) return 0;
  const positives =
    labels.reduce((sum, label) => sum + label, 0) / labels.length;
  return 1 - positives ** 2 - (1 - positives) ** 2;
}

function majority(labels: number[]): number {
  return Number(
    labels.reduce((sum, label) => sum + label, 0) / labels.length >= 0.5,
  );
}

function trainTree(
  dataset: EncodedDataset,
  maxDepth: number,
  minSamples: number,
  signal?: AbortSignal,
): TreeNode {
  const build = (indices: number[], depth: number): TreeNode => {
    throwIfAborted(signal);
    const labels = indices.map((index) => dataset.labels[index]);
    const node: TreeNode = { prediction: majority(labels) };
    if (
      depth >= maxDepth ||
      indices.length < minSamples * 2 ||
      labels.every((label) => label === labels[0])
    ) {
      return node;
    }
    let best:
      | {
          feature: number;
          threshold: number;
          score: number;
          left: number[];
          right: number[];
        }
      | undefined;
    for (let feature = 0; feature < dataset.features[0].length; feature++) {
      const values = [
        ...new Set(indices.map((index) => dataset.features[index][feature])),
      ].sort((a, b) => a - b);
      const thresholds = values
        .slice(1)
        .map((value, index) => (value + values[index]) / 2);
      for (const threshold of thresholds) {
        const left = indices.filter(
          (index) => dataset.features[index][feature] <= threshold,
        );
        const right = indices.filter(
          (index) => dataset.features[index][feature] > threshold,
        );
        if (left.length < minSamples || right.length < minSamples) continue;
        const score =
          (left.length / indices.length) *
            gini(left.map((index) => dataset.labels[index])) +
          (right.length / indices.length) *
            gini(right.map((index) => dataset.labels[index]));
        if (!best || score < best.score)
          best = { feature, threshold, score, left, right };
      }
    }
    if (!best) return node;
    node.feature = best.feature;
    node.threshold = best.threshold;
    node.left = build(best.left, depth + 1);
    node.right = build(best.right, depth + 1);
    return node;
  };
  return build(
    dataset.labels.map((_, index) => index),
    0,
  );
}

function predictTree(node: TreeNode, features: number[]): number {
  if (node.feature === undefined || node.threshold === undefined)
    return node.prediction;
  return features[node.feature] <= node.threshold
    ? predictTree(node.left ?? node, features)
    : predictTree(node.right ?? node, features);
}

function metrics(labels: number[], predictions: number[]): BrowserMetricSet {
  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;
  labels.forEach((label, index) => {
    const prediction = predictions[index];
    if (label === 1 && prediction === 1) truePositive++;
    if (label === 0 && prediction === 1) falsePositive++;
    if (label === 0 && prediction === 0) trueNegative++;
    if (label === 1 && prediction === 0) falseNegative++;
  });
  const precision = truePositive / Math.max(1, truePositive + falsePositive);
  const recall = truePositive / Math.max(1, truePositive + falseNegative);
  return {
    accuracy: (truePositive + trueNegative) / labels.length,
    precision,
    recall,
    f1: (2 * precision * recall) / Math.max(Number.EPSILON, precision + recall),
    confusionMatrix: {
      truePositive,
      falsePositive,
      trueNegative,
      falseNegative,
    },
  };
}

function numberArgument(
  task: PipelineSnapshot["tasks"][number] | undefined,
  name: string,
  fallback: number,
) {
  const value = Number(task?.arguments[name]);
  return Number.isFinite(value) ? value : fallback;
}

export async function executeBrowserPipeline(
  pipeline: PipelineSnapshot,
  csvText: string,
  options: EngineOptions = {},
): Promise<BrowserRunResult> {
  const started = performance.now();
  progress(options, "loading", 5, "Reading the local CSV");
  throwIfAborted(options.signal);
  const rows = parseCsv(csvText);

  progress(
    options,
    "preprocessing",
    20,
    "Filling missing values and encoding categories",
  );
  const encoded = encodeDataset(rows);
  const splitTask = pipeline.tasks.find(
    (task) => task.componentId === "train-test-split",
  );
  const seed = numberArgument(splitTask, "seed", 42);
  const testRatio = Math.min(
    0.4,
    Math.max(0.15, numberArgument(splitTask, "test_ratio", 0.25)),
  );
  const { train, test } = stratifiedSplit(encoded, testRatio, seed);

  const modelResults: BrowserModelResult[] = [];
  const logisticTasks = pipeline.tasks.filter(
    (task) => task.componentId === "logistic-regression",
  );
  const treeTasks = pipeline.tasks.filter(
    (task) => task.componentId === "decision-tree",
  );
  if (logisticTasks.length + treeTasks.length === 0) {
    throw new Error(
      "Add at least one supported classifier before running the pipeline.",
    );
  }

  for (const task of logisticTasks) {
    progress(options, "training", 40, `Training ${task.name}`);
    const predict = trainLogisticRegression(
      train,
      Math.min(2_000, Math.max(50, numberArgument(task, "iterations", 800))),
      Math.min(1, Math.max(0.001, numberArgument(task, "learning_rate", 0.1))),
      options.signal,
    );
    modelResults.push({
      taskId: task.id,
      taskName: task.name,
      algorithm: "logistic-regression",
      metrics: metrics(test.labels, test.features.map(predict)),
    });
  }

  for (const task of treeTasks) {
    progress(options, "training", 68, `Training ${task.name}`);
    const tree = trainTree(
      train,
      Math.min(8, Math.max(1, numberArgument(task, "max_depth", 4))),
      Math.min(20, Math.max(2, numberArgument(task, "min_samples", 3))),
      options.signal,
    );
    modelResults.push({
      taskId: task.id,
      taskName: task.name,
      algorithm: "decision-tree",
      metrics: metrics(
        test.labels,
        test.features.map((features) => predictTree(tree, features)),
      ),
    });
  }

  progress(options, "evaluating", 90, "Comparing recall and F1 score");
  modelResults.sort(
    (a, b) =>
      b.metrics.recall - a.metrics.recall || b.metrics.f1 - a.metrics.f1,
  );
  const preferred = modelResults[0];
  const runnerUp = modelResults[1];
  const reason = runnerUp
    ? `${preferred.taskName} is preferred because recall is ${(preferred.metrics.recall * 100).toFixed(1)}% versus ${(runnerUp.metrics.recall * 100).toFixed(1)}%. That reduces missed equipment failures, the costliest error in this workflow.`
    : `${preferred.taskName} achieved ${(preferred.metrics.recall * 100).toFixed(1)}% recall. Recall is the priority because a false negative is a missed equipment failure.`;
  progress(options, "evaluating", 100, "Local run complete");

  return {
    runId: `browser-${Date.now().toString(36)}`,
    seed,
    rowCount: rows.length,
    trainRowCount: train.labels.length,
    testRowCount: test.labels.length,
    durationMs: Math.round(performance.now() - started),
    models: modelResults,
    preferredModelTaskId: preferred.taskId,
    preferredModelName: preferred.taskName,
    selectionReason: reason,
  };
}
