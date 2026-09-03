import type {
  BrowserMetricSet,
  BrowserModelResult,
  BrowserRunResult,
  EmbeddingRunResult,
  PipelineSnapshot,
  RunnerProgress,
} from "../types";

type Row = Record<string, string>;
type Task = PipelineSnapshot["tasks"][number];
interface Dataset {
  features: number[][];
  labels: number[];
  featureNames: string[];
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

const MAX_ROWS = 5_000;
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
    featureNames: [
      ...numericColumns,
      ...categories.map(({ column, value }) => `${column}: ${value}`),
    ],
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
    featureNames: dataset.featureNames,
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
  const probability = (features: number[]) =>
    sigmoid(
      features.reduce(
        (sum, value, feature) => sum + value * weights[feature],
        bias,
      ),
    );
  return {
    weights,
    probability,
    predict: (features: number[]) => Number(probability(features) >= 0.42),
  };
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
      const allValues = [
        ...new Set(indexes.map((index) => dataset.features[index][feature])),
      ].sort((a, b) => a - b);
      const values =
        allValues.length <= 25
          ? allValues
          : Array.from(
              { length: 25 },
              (_, index) =>
                allValues[Math.round((index / 24) * (allValues.length - 1))],
            );
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
  const sampleStep = Math.max(1, Math.ceil(features.length / 500));
  const sampleIndexes = features
    .map((_, index) => index)
    .filter((index) => index % sampleStep === 0);
  const values = sampleIndexes.map((index) => {
    const row = features[index];
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

function normalizeVector(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
  return vector.map((value) => value / Math.max(Number.EPSILON, norm));
}

function projectEmbeddings(vectors: number[][]) {
  const dimensions = vectors[0]?.length ?? 0;
  if (!dimensions) return vectors.map(() => ({ x: 0, y: 0 }));
  const means = Array.from(
    { length: dimensions },
    (_, dimension) =>
      vectors.reduce((sum, vector) => sum + vector[dimension], 0) /
      vectors.length,
  );
  const centered = vectors.map((vector) =>
    vector.map((value, dimension) => value - means[dimension]),
  );
  const covariance = Array.from({ length: dimensions }, (_, row) =>
    Array.from(
      { length: dimensions },
      (_, column) =>
        centered.reduce(
          (sum, vector) => sum + vector[row] * vector[column],
          0,
        ) / Math.max(1, centered.length - 1),
    ),
  );
  const principalComponent = (offset: number, orthogonalTo?: number[]) => {
    let component = normalizeVector(
      Array.from({ length: dimensions }, (_, index) =>
        Math.sin((index + 1) * (offset + 1.37)),
      ),
    );
    for (let iteration = 0; iteration < 40; iteration++) {
      let next = covariance.map((row) =>
        row.reduce((sum, value, index) => sum + value * component[index], 0),
      );
      if (orthogonalTo) {
        const projection = next.reduce(
          (sum, value, index) => sum + value * orthogonalTo[index],
          0,
        );
        next = next.map(
          (value, index) => value - projection * orthogonalTo[index],
        );
      }
      component = normalizeVector(next);
    }
    return component;
  };
  const xComponent = principalComponent(1);
  const yComponent = principalComponent(2, xComponent);
  const raw = centered.map((vector) => ({
    x: vector.reduce((sum, value, index) => sum + value * xComponent[index], 0),
    y: vector.reduce((sum, value, index) => sum + value * yComponent[index], 0),
  }));
  const scaleX = Math.max(Number.EPSILON, ...raw.map(({ x }) => Math.abs(x)));
  const scaleY = Math.max(Number.EPSILON, ...raw.map(({ y }) => Math.abs(y)));
  return raw.map(({ x, y }) => ({ x: x / scaleX, y: y / scaleY }));
}

function trainProduct2Vec(
  rows: Row[],
  task: Task,
  idColumn: string,
  dimensions: number,
  options: EngineOptions,
) {
  const contextColumn = stringArg(task, "context_column", "copurchase_skus");
  const epochs = Math.min(
    240,
    Math.max(10, Math.round(numberArg(task, "epochs", 80))),
  );
  const initialRate = Math.min(
    0.2,
    Math.max(0.005, numberArg(task, "learning_rate", 0.04)),
  );
  const negativeSamples = Math.min(
    6,
    Math.max(1, Math.round(numberArg(task, "negative_samples", 4))),
  );
  const seed = Math.round(numberArg(task, "seed", 42));
  const ids = rows.map((row) => row[idColumn]);
  if (ids.some((id) => !id))
    throw new Error(`Every row needs a value in ${idColumn}.`);
  const indexById = new Map(ids.map((id, index) => [id, index]));
  if (indexById.size !== ids.length)
    throw new Error(`${idColumn} values must be unique for Product2Vec.`);
  const pairKeys = new Set<string>();
  rows.forEach((row, source) => {
    (row[contextColumn] || "")
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12)
      .forEach((id) => {
        const target = indexById.get(id);
        if (target === undefined || target === source) return;
        pairKeys.add(`${source}:${target}`);
        pairKeys.add(`${target}:${source}`);
      });
  });
  const pairs = [...pairKeys].map(
    (key) => key.split(":").map(Number) as [number, number],
  );
  if (pairs.length < 4)
    throw new Error(
      `Product2Vec needs at least two valid SKU links in ${contextColumn}.`,
    );

  const positives = new Set(pairKeys);
  const random = seededRandom(seed);
  const scale = 0.5 / Math.max(1, dimensions);
  const inputVectors = rows.map(() =>
    Array.from({ length: dimensions }, () => (random() - 0.5) * scale),
  );
  const contextVectors = rows.map(() =>
    Array.from({ length: dimensions }, () => (random() - 0.5) * scale),
  );
  const update = (
    source: number,
    target: number,
    label: 0 | 1,
    rate: number,
  ) => {
    const sourceVector = inputVectors[source];
    const targetVector = contextVectors[target];
    const score = sourceVector.reduce(
      (sum, value, dimension) => sum + value * targetVector[dimension],
      0,
    );
    const probability = sigmoid(score);
    const error = label - probability;
    for (let dimension = 0; dimension < dimensions; dimension++) {
      const sourceValue = sourceVector[dimension];
      const targetValue = targetVector[dimension];
      sourceVector[dimension] +=
        rate * (error * targetValue - 0.0001 * sourceValue);
      targetVector[dimension] +=
        rate * (error * sourceValue - 0.0001 * targetValue);
    }
    return -(
      label * Math.log(Math.max(1e-7, probability)) +
      (1 - label) * Math.log(Math.max(1e-7, 1 - probability))
    );
  };

  const lossCurve: Array<{ epoch: number; loss: number }> = [];
  const recordEvery = Math.max(1, Math.floor(epochs / 12));
  for (let epoch = 1; epoch <= epochs; epoch++) {
    guard(options.signal);
    const shuffled = [...pairs];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    const rate = initialRate * (1 - 0.8 * ((epoch - 1) / epochs));
    let loss = 0;
    let observations = 0;
    for (const [source, target] of shuffled) {
      loss += update(source, target, 1, rate);
      observations++;
      for (let sample = 0; sample < negativeSamples; sample++) {
        let negative = Math.floor(random() * rows.length);
        let attempts = 0;
        while (
          (negative === source || positives.has(`${source}:${negative}`)) &&
          attempts < rows.length
        ) {
          negative = (negative + 1) % rows.length;
          attempts++;
        }
        loss += update(source, negative, 0, rate);
        observations++;
      }
    }
    if (epoch === 1 || epoch % recordEvery === 0 || epoch === epochs) {
      lossCurve.push({ epoch, loss: loss / Math.max(1, observations) });
      report(
        options,
        "embedding",
        20 + Math.round((epoch / epochs) * 52),
        `Training Product2Vec · epoch ${epoch}/${epochs}`,
      );
    }
  }

  const vectors = inputVectors.map((input, row) =>
    normalizeVector(
      input.map((value, dimension) => value + contextVectors[row][dimension]),
    ),
  );
  const contextSimilarity =
    pairs.reduce(
      (sum, [source, target]) => sum + cosine(vectors[source], vectors[target]),
      0,
    ) / pairs.length;
  const baselinePairs = pairs.map(([source], index) => {
    let target = (source + Math.floor(rows.length / 2) + index) % rows.length;
    while (target === source || positives.has(`${source}:${target}`))
      target = (target + 1) % rows.length;
    return [source, target] as const;
  });
  const baselineSimilarity =
    baselinePairs.reduce(
      (sum, [source, target]) => sum + cosine(vectors[source], vectors[target]),
      0,
    ) / baselinePairs.length;
  return {
    vectors,
    seed,
    vocabularySize: rows.length,
    training: {
      epochs,
      pairCount: pairs.length,
      negativeSamples,
      initialLoss: lossCurve[0].loss,
      finalLoss: lossCurve.at(-1)?.loss ?? lossCurve[0].loss,
      contextSimilarity,
      baselineSimilarity,
      lossCurve,
    },
  };
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
  let logisticModel: ReturnType<typeof trainLogistic> | null = null;
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
    const model = trainLogistic(
      train,
      Math.min(2_000, Math.max(50, numberArg(task, "iterations", 800))),
      Math.min(1, Math.max(0.001, numberArg(task, "learning_rate", 0.1))),
      options.signal,
    );
    logisticModel ??= model;
    results.push({
      taskId: task.id,
      taskName: task.name,
      algorithm: "logistic-regression",
      metrics: metrics(test.labels, test.features.map(model.predict)),
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
  const score = logisticModel?.probability ?? (() => 0.5);
  const testScores = test.features.map(score);
  const allScores = dataset.features.map(score);
  const thresholdCurve = Array.from({ length: 9 }, (_, index) => {
    const threshold = (index + 1) / 10;
    const result = metrics(
      test.labels,
      testScores.map((value) => Number(value >= threshold)),
    );
    return {
      threshold,
      precision: result.precision,
      recall: result.recall,
      f1: result.f1,
    };
  });
  const riskDistribution = Array.from({ length: 5 }, (_, index) => {
    const lower = index * 0.2;
    const upper = lower + 0.2;
    const indexes = allScores
      .map((value, rowIndex) => ({ value, rowIndex }))
      .filter(({ value }) =>
        index === 4 ? value >= lower : value >= lower && value < upper,
      )
      .map(({ rowIndex }) => rowIndex);
    return {
      label: `${Math.round(lower * 100)}–${Math.round(upper * 100)}%`,
      count: indexes.length,
      churnRate: indexes.length
        ? indexes.reduce((sum, rowIndex) => sum + dataset.labels[rowIndex], 0) /
          indexes.length
        : 0,
    };
  });
  const driverWeights = logisticModel?.weights ?? [];
  const maxWeight = Math.max(
    Number.EPSILON,
    ...driverWeights.map((value) => Math.abs(value)),
  );
  const featureDrivers = dataset.featureNames
    .map((feature, index) => ({
      feature: feature
        .replaceAll("_", " ")
        .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()),
      importance: Math.abs(driverWeights[index] ?? 0) / maxWeight,
      direction:
        (driverWeights[index] ?? 0) >= 0
          ? ("increases" as const)
          : ("decreases" as const),
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 7);
  const rankedRows = rows
    .map((row, index) => ({ row, risk: allScores[index] }))
    .sort((a, b) => b.risk - a.risk);
  const highRiskCustomers = rankedRows.slice(0, 8).map(({ row, risk }) => ({
    customerId:
      row.customer_id || row.machine_id || `Row ${rows.indexOf(row) + 1}`,
    risk,
    lifetimeValue: Number(row.lifetime_value || row.spend || 0),
    segment: (
      row.latent_segment ||
      row.machine_type ||
      "unassigned"
    ).replaceAll("-", " "),
    action:
      row.recommended_action ||
      (target.toLowerCase().includes("churn")
        ? "Prioritise for a personal retention review"
        : "Schedule a preventive inspection"),
  }));
  const campaignSizes = [50, 100, 250, 500, 1_000, rows.length]
    .filter(
      (value, index, values) =>
        value <= rows.length && values.indexOf(value) === index,
    )
    .sort((a, b) => a - b);
  const interventionCurve = campaignSizes.map((customers) => {
    const revenueSaved = rankedRows
      .slice(0, customers)
      .reduce(
        (sum, { row, risk }) =>
          sum + Number(row.lifetime_value || row.spend || 1_000) * risk * 0.22,
        0,
      );
    const cost = customers * 28;
    return { customers, revenueSaved, cost, netValue: revenueSaved - cost };
  });
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
    thresholdCurve,
    riskDistribution,
    featureDrivers,
    highRiskCustomers,
    interventionCurve,
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
  const basketIndex = names.indexOf("avg_basket");
  const discountIndex = names.indexOf("discount_share");
  const returnIndex = names.indexOf("return_rate");
  const engagementIndex = names.indexOf("email_engagement");
  const totalRevenue = rows.reduce(
    (sum, row) => sum + Number(row.spend || 0),
    0,
  );
  const centroidValues = Array.from({ length: count }, (_, cluster) => {
    const members = features.filter(
      (_, index) => assignments[index] === cluster,
    );
    return features[0].map(
      (_, feature) =>
        members.reduce((sum, row) => sum + row[feature], 0) /
        Math.max(1, members.length),
    );
  });
  const actionForLabel = (label: string) => {
    if (label === "VIP loyalists")
      return "Offer early product access and premium bundles.";
    if (label === "High-value loyalists")
      return "Invite into the top loyalty tier with category cross-sells.";
    if (label === "Frequent regulars")
      return "Use replenishment reminders and free-shipping thresholds.";
    if (label === "Lapsing customers")
      return "Run a service-led win-back campaign before discounting.";
    return "Guide the second purchase with category education.";
  };
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
    const centroid = centroidValues[cluster];
    const examples = members
      .map((index) => ({
        index,
        distance: distance(features[index], centroid),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(({ index }) => ({
        customerId: rows[index].customer_id || `Customer ${index + 1}`,
        lifetimeValue: Number(
          rows[index].lifetime_value || rows[index].spend || 0,
        ),
        orders: Number(rows[index].orders || 0),
        daysSinceOrder: Number(rows[index].days_since_order || 0),
      }));
    const clusterRevenue = members.reduce(
      (sum, index) => sum + Number(rows[index].spend || 0),
      0,
    );
    return {
      cluster,
      size: members.length,
      share: members.length / rows.length,
      label,
      summary: `$${Math.round(spend)} average spend · ${Math.round(orders)} orders · ${Math.round(recency)} days since purchase`,
      revenueShare: clusterRevenue / Math.max(1, totalRevenue),
      action: actionForLabel(label),
      examples,
    };
  }).sort((a, b) => b.size - a.size);
  const projected = features.map((row) => ({
    x:
      (spendIndex >= 0 ? row[spendIndex] * 0.55 : 0) +
      (orderIndex >= 0 ? row[orderIndex] * 0.3 : 0) +
      (basketIndex >= 0 ? row[basketIndex] * 0.15 : 0),
    y:
      (engagementIndex >= 0 ? row[engagementIndex] * 0.45 : 0) -
      (recencyIndex >= 0 ? row[recencyIndex] * 0.45 : 0) -
      (discountIndex >= 0 ? row[discountIndex] * 0.08 : 0) -
      (returnIndex >= 0 ? row[returnIndex] * 0.12 : 0),
  }));
  const maxX = Math.max(1, ...projected.map(({ x }) => Math.abs(x)));
  const maxY = Math.max(1, ...projected.map(({ y }) => Math.abs(y)));
  const pointStep = Math.max(1, Math.ceil(rows.length / 320));
  const points = projected
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % pointStep === 0)
    .map(({ point, index }) => ({
      customerId: rows[index].customer_id || `Customer ${index + 1}`,
      cluster: assignments[index],
      x: point.x / maxX,
      y: point.y / maxY,
    }));
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
    featureNames: names,
    centroids: centroidValues.map((values, cluster) => ({ cluster, values })),
    points,
    insight: `${profiles[0].label} is the largest segment at ${Math.round(profiles[0].share * 100)}% of customers.`,
  };
}

function embeddings(
  pipeline: PipelineSnapshot,
  rows: Row[],
  started: number,
  options: EngineOptions,
): BrowserRunResult {
  const product2VecTask = pipeline.tasks.find(
    (candidate) => candidate.componentId === "product2vec",
  );
  const textTask = pipeline.tasks.find(
    (candidate) => candidate.componentId === "text-embedding",
  );
  const task = product2VecTask ?? textTask;
  if (!task)
    throw new Error(
      "Add a supported embedding task before running this pipeline.",
    );
  const idColumn = stringArg(task, "id_column", "sku");
  const dimensions = Math.min(
    64,
    Math.max(8, Math.round(numberArg(task, "dimensions", 24))),
  );
  const neighborTask = pipeline.tasks.find(
    (candidate) => candidate.componentId === "nearest-neighbors",
  );
  const neighborCount = Math.min(
    5,
    Math.max(1, Math.round(numberArg(neighborTask, "neighbors", 3))),
  );
  let algorithm: "tf-idf" | "product2vec" = "tf-idf";
  let seed = 42;
  let vocabularySize = 0;
  let training: EmbeddingRunResult["training"] = null;
  let vectors: number[][];
  if (product2VecTask) {
    algorithm = "product2vec";
    report(options, "embedding", 16, "Preparing co-purchase training pairs");
    const fitted = trainProduct2Vec(
      rows,
      product2VecTask,
      idColumn,
      dimensions,
      options,
    );
    vectors = fitted.vectors;
    seed = fitted.seed;
    vocabularySize = fitted.vocabularySize;
    training = fitted.training;
  } else {
    const columns = listArg(textTask, "text_columns", [
      "name",
      "category",
      "description",
    ]);
    report(options, "embedding", 28, "Building deterministic text features");
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
    vectors = documents.map((document) => {
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
      return normalizeVector(vector);
    });
    vocabularySize = vocabulary.length;
  }
  report(options, "embedding", 72, "Comparing cosine similarity");
  const productGroups = rows.map((row, index) => {
    const nearest = rows
      .map((_, other) => ({
        other,
        similarity:
          other === index ? -1 : cosine(vectors[index], vectors[other]),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, neighborCount);
    return {
      sku: row[idColumn],
      name: row.name || row[idColumn],
      category: row.category || "uncategorised",
      neighbors: nearest.map(({ other, similarity }) => ({
        sku: rows[other][idColumn],
        name: rows[other].name || rows[other][idColumn],
        similarity: Math.max(0, similarity),
      })),
    };
  });
  const neighbors = productGroups
    .map((product) => {
      const best = product.neighbors[0];
      return {
        item: product.sku,
        match: best.sku,
        similarity: best.similarity,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6);
  const projectedPoints = projectEmbeddings(vectors);
  const points = projectedPoints.map((point, index) => ({
    sku: rows[index][idColumn],
    name: rows[index].name || rows[index][idColumn],
    category: rows[index].category || "uncategorised",
    x: point.x,
    y: point.y,
  }));
  const categoryNames = [
    ...new Set(rows.map((row) => row.category || "uncategorised")),
  ].sort();
  const categoryCohesion = categoryNames
    .map((category) => {
      const indexes = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => (row.category || "uncategorised") === category)
        .map(({ index }) => index);
      let score = 0;
      let comparisons = 0;
      indexes.forEach((index, position) => {
        indexes.slice(position + 1).forEach((other) => {
          score += cosine(vectors[index], vectors[other]);
          comparisons++;
        });
      });
      return {
        category,
        score: score / Math.max(1, comparisons),
        productCount: indexes.length,
      };
    })
    .sort((a, b) => b.score - a.score);
  const matrixIndexes = categoryNames
    .map((category) => rows.findIndex((row) => row.category === category))
    .filter((index) => index >= 0)
    .slice(0, 8);
  const similarityMatrix = {
    labels: matrixIndexes.map((index) => rows[index][idColumn]),
    values: matrixIndexes.map((index) =>
      matrixIndexes.map((other) =>
        Math.max(0, cosine(vectors[index], vectors[other])),
      ),
    ),
  };
  const seenLinks = new Set<string>();
  const coPurchaseLinks = rows
    .flatMap((row) =>
      (row.copurchase_skus || "")
        .split("|")
        .filter(Boolean)
        .slice(0, 3)
        .flatMap((target, index) => {
          const source = row[idColumn];
          const key = [source, target].sort().join("|");
          if (seenLinks.has(key)) return [];
          seenLinks.add(key);
          return [{ source, target, strength: [1, 0.72, 0.5][index] }];
        }),
    )
    .slice(0, 30);
  const unexpectedPairs = rows
    .flatMap((row, index) =>
      rows.slice(index + 1).map((other, offset) => {
        const otherIndex = index + offset + 1;
        return {
          source: row[idColumn],
          sourceName: row.name || row[idColumn],
          target: other[idColumn],
          targetName: other.name || other[idColumn],
          sourceCategory: row.category,
          targetCategory: other.category,
          similarity: cosine(vectors[index], vectors[otherIndex]),
        };
      }),
    )
    .filter((pair) => pair.sourceCategory !== pair.targetCategory)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6)
    .map(
      ({
        sourceCategory: _sourceCategory,
        targetCategory: _targetCategory,
        ...pair
      }) => pair,
    );
  report(options, "evaluating", 100, "Nearest product matches ready");
  return {
    kind: "embedding",
    runId: `browser-${Date.now().toString(36)}`,
    seed,
    rowCount: rows.length,
    durationMs: Math.round(performance.now() - started),
    algorithm,
    dimensions,
    vocabularySize,
    training,
    neighbors,
    products: productGroups,
    points,
    similarityMatrix,
    categoryCohesion,
    coPurchaseLinks,
    unexpectedPairs,
    insight:
      algorithm === "product2vec"
        ? `${neighbors[0].item} and ${neighbors[0].match} are the strongest learned co-purchase match at ${Math.round(neighbors[0].similarity * 100)}%.`
        : `${neighbors[0].item} and ${neighbors[0].match} are the strongest semantic match at ${Math.round(neighbors[0].similarity * 100)}%.`,
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
  if (
    pipeline.tasks.some(
      (task) =>
        task.componentId === "text-embedding" ||
        task.componentId === "product2vec",
    )
  )
    return embeddings(pipeline, rows, started, options);
  return classification(pipeline, rows, started, options);
}
