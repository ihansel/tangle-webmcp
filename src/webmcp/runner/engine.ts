import type {
  BrowserMetricSet,
  BrowserModelResult,
  BrowserRunResult,
  PipelineSnapshot,
  RunnerProgress,
} from "../types";

type Row = Record<string, string>;
type Task = PipelineSnapshot["tasks"][number];
interface Dataset {
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

function guard(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new DOMException("Browser run cancelled", "AbortError");
}

function report(
  options: EngineOptions,
  phase: RunnerProgress["phase"],
  percent: number,
  message: string,
) {
  options.onProgress?.({ phase, percent, message });
}

function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 3)
    throw new Error("Dataset must contain a header and at least two rows.");
  if (lines.length - 1 > MAX_ROWS)
    throw new Error(`Dataset exceeds the ${MAX_ROWS}-row browser limit.`);
  const headers = lines[0].split(",").map((value) => value.trim());
  if (headers.length > MAX_COLUMNS)
    throw new Error(`Dataset exceeds the ${MAX_COLUMNS}-column browser limit.`);
  return lines.slice(1).map((line, rowIndex) => {
    const values = line.split(",").map((value) => value.trim());
    if (values.length !== headers.length)
      throw new Error(
        `Row ${rowIndex + 2} has ${values.length} values; expected ${headers.length}.`,
      );
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]]),
    );
  });
}

function listArg(task: Task | undefined, name: string, fallback: string[]) {
  const value = task?.arguments[name];
  if (typeof value !== "string") return fallback;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function stringArg(task: Task | undefined, name: string, fallback: string) {
  const value = task?.arguments[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberArg(task: Task | undefined, name: string, fallback: number) {
  const value = Number(task?.arguments[name]);
  return Number.isFinite(value) ? value : fallback;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardize(features: number[][]) {
  const means = features[0].map(
    (_, feature) =>
      features.reduce((sum, row) => sum + row[feature], 0) / features.length,
  );
  const deviations = means.map((mean, feature) => {
    const variance =
      features.reduce((sum, row) => sum + (row[feature] - mean) ** 2, 0) /
      features.length;
    return Math.sqrt(variance) || 1;
  });
  return features.map((row) =>
    row.map((value, feature) => (value - means[feature]) / deviations[feature]),
  );
}

function encode(
  rows: Row[],
  target: string,
  categoricalColumns: string[],
): Dataset {
  if (!(target in rows[0]))
    throw new Error(`Target column ${target} was not found.`);
  const categorical = new Set(categoricalColumns);
  const ignored = new Set([target, "machine_id", "customer_id", "sku"]);
  const numericColumns = Object.keys(rows[0]).filter(
    (column) =>
      !ignored.has(column) &&
      !categorical.has(column) &&
      rows.some((row) => Number.isFinite(Number(row[column]))),
  );
  const categories = categoricalColumns.flatMap((column) =>
    [...new Set(rows.map((row) => row[column] || "unknown"))]
      .sort()
      .map((value) => ({ column, value })),
  );
  const medians = Object.fromEntries(
    numericColumns.map((column) => {
      const present = rows
        .map((row) => Number(row[column]))
        .filter(Number.isFinite);
      if (!present.length)
        throw new Error(`Column ${column} has no numeric values.`);
      return [column, median(present)];
    }),
  );
  const raw = rows.map((row) => [
    ...numericColumns.map((column) => {
      const value = Number(row[column]);
      return Number.isFinite(value) ? value : medians[column];
    }),
    ...categories.map(({ column, value }) =>
      Number((row[column] || "unknown") === value),
    ),
  ]);
  if (!raw[0]?.length) throw new Error("No usable model features were found.");
  return {
    features: standardize(raw),
    labels: rows.map((row) =>
      ["1", "true", "yes", "churned"].includes(row[target].toLowerCase())
        ? 1
        : 0,
    ),
  };
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function split(dataset: Dataset, ratio: number, seed: number) {
  const random = seededRandom(seed);
  const groups = [0, 1].map((label) =>
    dataset.labels
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value === label)
      .map((item) => item.index),
  );
  groups.forEach((indices) => {
    for (let index = indices.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [indices[index], indices[other]] = [indices[other], indices[index]];
    }
  });
  const testIndexes = new Set(
    groups.flatMap((indices) =>
      indices.slice(0, Math.max(1, Math.round(indices.length * ratio))),
    ),
  );
  const project = (indexes: number[]): Dataset => ({
    features: indexes.map((index) => dataset.features[index]),
    labels: indexes.map((index) => dataset.labels[index]),
  });
  const all = dataset.labels.map((_, index) => index);
  return {
    train: project(all.filter((index) => !testIndexes.has(index))),
    test: project(all.filter((index) => testIndexes.has(index))),
  };
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
}

function trainLogistic(
  dataset: Dataset,
  iterations: number,
  rate: number,
  signal?: AbortSignal,
) {
  const weights = new Array(dataset.features[0].length).fill(0);
  let bias = 0;
  for (let iteration = 0; iteration < iterations; iteration++) {
    if (iteration % 25 === 0) guard(signal);
    const gradient = new Array(weights.length).fill(0);
    let biasGradient = 0;
    dataset.features.forEach((row, rowIndex) => {
      const score = row.reduce(
        (sum, value, feature) => sum + value * weights[feature],
        bias,
      );
      const error = sigmoid(score) - dataset.labels[rowIndex];
      row.forEach((value, feature) => (gradient[feature] += error * value));
      biasGradient += error;
    });
    weights.forEach(
      (_, feature) =>
        (weights[feature] -=
          (rate * gradient[feature]) / dataset.features.length),
    );
    bias -= (rate * biasGradient) / dataset.features.length;
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

function gini(labels: number[]) {
  if (!labels.length) return 0;
  const positive =
    labels.reduce((sum, value) => sum + value, 0) / labels.length;
  return 1 - positive ** 2 - (1 - positive) ** 2;
}

function trainTree(
  dataset: Dataset,
  maxDepth: number,
  minSamples: number,
  signal?: AbortSignal,
): TreeNode {
  const build = (indexes: number[], depth: number): TreeNode => {
    guard(signal);
    const labels = indexes.map((index) => dataset.labels[index]);
    const node: TreeNode = {
      prediction: Number(
        labels.reduce((sum, value) => sum + value, 0) / labels.length >= 0.5,
      ),
    };
    if (
      depth >= maxDepth ||
      indexes.length < minSamples * 2 ||
      labels.every((label) => label === labels[0])
    )
      return node;
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
        ...new Set(indexes.map((index) => dataset.features[index][feature])),
      ].sort((a, b) => a - b);
      for (let valueIndex = 1; valueIndex < values.length; valueIndex++) {
        const threshold = (values[valueIndex - 1] + values[valueIndex]) / 2;
        const left = indexes.filter(
          (index) => dataset.features[index][feature] <= threshold,
        );
        const right = indexes.filter(
          (index) => dataset.features[index][feature] > threshold,
        );
        if (left.length < minSamples || right.length < minSamples) continue;
        const score =
          (left.length * gini(left.map((index) => dataset.labels[index])) +
            right.length * gini(right.map((index) => dataset.labels[index]))) /
          indexes.length;
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

function distance(a: number[], b: number[]) {
  return Math.sqrt(
    a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0),
  );
}

function kMeans(
  features: number[][],
  count: number,
  seed: number,
  signal?: AbortSignal,
) {
  const random = seededRandom(seed);
  const used = new Set<number>();
  const centroids: number[][] = [];
  while (centroids.length < count) {
    const index = Math.floor(random() * features.length);
    if (!used.has(index)) {
      used.add(index);
      centroids.push([...features[index]]);
    }
  }
  const assignments = new Array(features.length).fill(-1);
  for (let iteration = 0; iteration < 40; iteration++) {
    guard(signal);
    let changed = false;
    features.forEach((row, rowIndex) => {
      const nearest = centroids
        .map((centroid, cluster) => ({
          cluster,
          value: distance(row, centroid),
        }))
        .sort((a, b) => a.value - b.value)[0].cluster;
      if (assignments[rowIndex] !== nearest) changed = true;
      assignments[rowIndex] = nearest;
    });
    centroids.forEach((centroid, cluster) => {
      const members = features.filter(
        (_, index) => assignments[index] === cluster,
      );
      if (!members.length) return;
      centroid.forEach((_, feature) => {
        centroid[feature] =
          members.reduce((sum, row) => sum + row[feature], 0) / members.length;
      });
    });
    if (!changed) break;
  }
  return assignments;
}

function silhouette(features: number[][], assignments: number[]) {
  const values = features.map((row, index) => {
    const own = assignments[index];
    const same = features.filter(
      (_, other) => assignments[other] === own && other !== index,
    );
    const a = same.length
      ? same.reduce((sum, other) => sum + distance(row, other), 0) / same.length
      : 0;
    const alternatives = [
      ...new Set(assignments.filter((value) => value !== own)),
    ];
    const b = Math.min(
      ...alternatives.map((cluster) => {
        const members = features.filter(
          (_, other) => assignments[other] === cluster,
        );
        return (
          members.reduce((sum, other) => sum + distance(row, other), 0) /
          members.length
        );
      }),
    );
    return (b - a) / Math.max(a, b, Number.EPSILON);
  });
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function tokenise(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function cosine(a: number[], b: number[]) {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const aNorm = Math.sqrt(a.reduce((sum, value) => sum + value ** 2, 0));
  const bNorm = Math.sqrt(b.reduce((sum, value) => sum + value ** 2, 0));
  return dot / Math.max(Number.EPSILON, aNorm * bNorm);
}

async function classification(
  pipeline: PipelineSnapshot,
  rows: Row[],
  started: number,
  options: EngineOptions,
): Promise<BrowserRunResult> {
  const splitTask = pipeline.tasks.find(
    (task) => task.componentId === "train-test-split",
  );
  const encodeTask = pipeline.tasks.find(
    (task) => task.componentId === "encode-categories",
  );
  const target = stringArg(splitTask, "target", "failure");
  report(
    options,
    "preprocessing",
    20,
    "Filling values and encoding categories",
  );
  const dataset = encode(
    rows,
    target,
    listArg(encodeTask, "columns", ["machine_type"]),
  );
  const seed = numberArg(splitTask, "seed", 42);
  const ratio = Math.min(
    0.4,
    Math.max(0.15, numberArg(splitTask, "test_ratio", 0.25)),
  );
  const { train, test } = split(dataset, ratio, seed);
  const results: BrowserModelResult[] = [];
  const logisticTasks = pipeline.tasks.filter(
    (task) => task.componentId === "logistic-regression",
  );
  const treeTasks = pipeline.tasks.filter(
    (task) => task.componentId === "decision-tree",
  );
  if (!logisticTasks.length && !treeTasks.length)
    throw new Error(
      "Add at least one supported classifier before running the pipeline.",
    );
  for (const task of logisticTasks) {
    report(options, "training", 42, `Training ${task.name}`);
    const predict = trainLogistic(
      train,
      Math.min(2_000, Math.max(50, numberArg(task, "iterations", 800))),
      Math.min(1, Math.max(0.001, numberArg(task, "learning_rate", 0.1))),
      options.signal,
    );
    results.push({
      taskId: task.id,
      taskName: task.name,
      algorithm: "logistic-regression",
      metrics: metrics(test.labels, test.features.map(predict)),
    });
  }
  for (const task of treeTasks) {
    report(options, "training", 70, `Training ${task.name}`);
    const tree = trainTree(
      train,
      Math.min(8, Math.max(1, numberArg(task, "max_depth", 4))),
      Math.min(20, Math.max(2, numberArg(task, "min_samples", 3))),
      options.signal,
    );
    results.push({
      taskId: task.id,
      taskName: task.name,
      algorithm: "decision-tree",
      metrics: metrics(
        test.labels,
        test.features.map((features) => predictTree(tree, features)),
      ),
    });
  }
  report(options, "evaluating", 92, "Comparing recall and F1 score");
  results.sort(
    (a, b) =>
      b.metrics.recall - a.metrics.recall || b.metrics.f1 - a.metrics.f1,
  );
  const preferred = results[0];
  const runnerUp = results[1];
  const subject = target.toLowerCase().includes("churn")
    ? "at-risk customers"
    : "equipment failures";
  const reason = runnerUp
    ? `${preferred.taskName} is preferred at ${(preferred.metrics.recall * 100).toFixed(1)}% recall versus ${(runnerUp.metrics.recall * 100).toFixed(1)}%. That reduces missed ${subject}.`
    : `${preferred.taskName} achieved ${(preferred.metrics.recall * 100).toFixed(1)}% recall, reducing missed ${subject}.`;
  report(options, "evaluating", 100, "Local run complete");
  return {
    kind: "classification",
    runId: `browser-${Date.now().toString(36)}`,
    seed,
    rowCount: rows.length,
    trainRowCount: train.labels.length,
    testRowCount: test.labels.length,
    durationMs: Math.round(performance.now() - started),
    models: results,
    preferredModelTaskId: preferred.taskId,
    preferredModelName: preferred.taskName,
    selectionReason: reason,
  };
}

function clustering(
  pipeline: PipelineSnapshot,
  rows: Row[],
  started: number,
  options: EngineOptions,
): BrowserRunResult {
  const task = pipeline.tasks.find(
    (candidate) => candidate.componentId === "k-means",
  );
  if (!task)
    throw new Error("Add a K-means task before running this pipeline.");
  const names = listArg(task, "features", [
    "orders",
    "spend",
    "avg_basket",
    "discount_share",
    "days_since_order",
  ]);
  const count = Math.min(
    6,
    Math.max(2, Math.round(numberArg(task, "clusters", 4))),
  );
  const seed = numberArg(task, "seed", 42);
  const raw = rows.map((row) =>
    names.map((name) => {
      const value = Number(row[name]);
      if (!Number.isFinite(value))
        throw new Error(`Feature ${name} must be numeric.`);
      return value;
    }),
  );
  report(options, "clustering", 35, `Finding ${count} customer segments`);
  const features = standardize(raw);
  const assignments = kMeans(features, count, seed, options.signal);
  const spendIndex = names.indexOf("spend");
  const recencyIndex = names.indexOf("days_since_order");
  const orderIndex = names.indexOf("orders");
  const profiles = Array.from({ length: count }, (_, cluster) => {
    const members = assignments
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value === cluster)
      .map((item) => item.index);
    const average = (feature: number) =>
      feature < 0
        ? 0
        : members.reduce((sum, index) => sum + raw[index][feature], 0) /
          Math.max(1, members.length);
    const spend = average(spendIndex);
    const recency = average(recencyIndex);
    const orders = average(orderIndex);
    const label =
      spend > 2700 && recency < 20
        ? "VIP loyalists"
        : spend > 1200 && recency < 35
          ? "High-value loyalists"
          : recency > 100
            ? "Lapsing customers"
            : orders > 10
              ? "Frequent regulars"
              : "Emerging shoppers";
    return {
      cluster,
      size: members.length,
      share: members.length / rows.length,
      label,
      summary: `$${Math.round(spend)} average spend · ${Math.round(orders)} orders · ${Math.round(recency)} days since purchase`,
    };
  }).sort((a, b) => b.size - a.size);
  report(options, "evaluating", 100, "Segment profiles ready");
  return {
    kind: "clustering",
    runId: `browser-${Date.now().toString(36)}`,
    seed,
    rowCount: rows.length,
    durationMs: Math.round(performance.now() - started),
    clusterCount: count,
    silhouetteScore: silhouette(features, assignments),
    clusters: profiles,
    insight: `${profiles[0].label} is the largest segment at ${Math.round(profiles[0].share * 100)}% of customers.`,
  };
}

function embeddings(
  pipeline: PipelineSnapshot,
  rows: Row[],
  started: number,
  options: EngineOptions,
): BrowserRunResult {
  const task = pipeline.tasks.find(
    (candidate) => candidate.componentId === "text-embedding",
  );
  if (!task)
    throw new Error("Add a text embedding task before running this pipeline.");
  const idColumn = stringArg(task, "id_column", "sku");
  const columns = listArg(task, "text_columns", [
    "name",
    "category",
    "description",
  ]);
  const dimensions = Math.min(
    64,
    Math.max(8, Math.round(numberArg(task, "dimensions", 24))),
  );
  report(options, "embedding", 28, "Building a local product vocabulary");
  const documents: string[][] = rows.map((row) =>
    tokenise(columns.map((column) => row[column] ?? "").join(" ")),
  );
  const vocabulary = [...new Set(documents.flat())].sort();
  const frequencies = new Map(
    vocabulary.map((token) => [
      token,
      documents.filter((document) => document.includes(token)).length,
    ]),
  );
  const vectors = documents.map((document) => {
    const vector = new Array(dimensions).fill(0);
    const counts = new Map<string, number>();
    document.forEach((token) =>
      counts.set(token, (counts.get(token) ?? 0) + 1),
    );
    counts.forEach((count, token) => {
      const hash = [...token].reduce(
        (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
        7,
      );
      const idf =
        Math.log((rows.length + 1) / ((frequencies.get(token) ?? 0) + 1)) + 1;
      vector[hash % dimensions] += (count / document.length) * idf;
    });
    return vector;
  });
  report(options, "embedding", 72, "Comparing cosine similarity");
  const neighbors = rows
    .map((row, index) => {
      const best = rows
        .map((_, other) => ({
          other,
          similarity:
            other === index ? -1 : cosine(vectors[index], vectors[other]),
        }))
        .sort((a, b) => b.similarity - a.similarity)[0];
      return {
        item: row[idColumn],
        match: rows[best.other][idColumn],
        similarity: Math.max(0, best.similarity),
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6);
  report(options, "evaluating", 100, "Nearest product matches ready");
  return {
    kind: "embedding",
    runId: `browser-${Date.now().toString(36)}`,
    seed: 42,
    rowCount: rows.length,
    durationMs: Math.round(performance.now() - started),
    dimensions,
    vocabularySize: vocabulary.length,
    neighbors,
    insight: `${neighbors[0].item} and ${neighbors[0].match} are the strongest semantic match at ${Math.round(neighbors[0].similarity * 100)}%.`,
  };
}

export async function executeBrowserPipeline(
  pipeline: PipelineSnapshot,
  csvText: string,
  options: EngineOptions = {},
): Promise<BrowserRunResult> {
  const started = performance.now();
  report(options, "loading", 5, "Reading the local CSV");
  guard(options.signal);
  const rows = parseCsv(csvText);
  if (pipeline.tasks.some((task) => task.componentId === "k-means"))
    return clustering(pipeline, rows, started, options);
  if (pipeline.tasks.some((task) => task.componentId === "text-embedding"))
    return embeddings(pipeline, rows, started, options);
  return classification(pipeline, rows, started, options);
}
