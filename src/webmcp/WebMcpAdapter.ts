import { z } from "zod";

import type { ArgumentType, ComponentSpec } from "@/models/componentSpec";
import { createCsomBridgeHandlers } from "@/routes/v2/pages/Editor/components/AiChat/toolBridge/csomBridge";
import { connectNodes } from "@/routes/v2/pages/Editor/store/actions/connection.actions";
import {
  addTask,
  renameTask,
} from "@/routes/v2/pages/Editor/store/actions/task.actions";
import { computeNextPosition } from "@/routes/v2/shared/components/AiChat/toolBridge/utils";
import type { UndoGroupable } from "@/routes/v2/shared/nodes/types";

import {
  componentIdFromUrl,
  createCuratedComponentReference,
  CURATED_COMPONENT_BY_ID,
  CURATED_COMPONENTS,
} from "./curatedComponents";
import { BrowserRunStore } from "./runner/BrowserRunStore";
import type { CuratedComponentId, PipelineSnapshot } from "./types";

const componentIds = [
  "load-csv",
  "select-columns",
  "fill-missing",
  "encode-categories",
  "train-test-split",
  "logistic-regression",
  "decision-tree",
  "evaluate",
  "compare-metrics",
] as const;

const literalValueSchema = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
]);
const taskSchema = z.object({
  clientId: z.string().min(1).max(48),
  componentId: z.enum(componentIds),
  name: z.string().min(1).max(100).optional(),
  configuration: z.record(z.string(), literalValueSchema).optional(),
});
const connectionSchema = z.object({
  sourceClientId: z.string().min(1).max(48),
  sourcePort: z.string().min(1).max(100),
  targetClientId: z.string().min(1).max(48),
  targetPort: z.string().min(1).max(100),
});

export interface WebMcpAdapterDeps {
  getSpec: () => ComponentSpec | null;
  getActiveSubgraphPath: () => string[];
  undo: UndoGroupable & {
    undo: () => void;
    canUndo: boolean;
    undoLevels: number;
  };
  runStore?: BrowserRunStore;
}

export interface AddPipelineTasksInput {
  tasks: Array<z.infer<typeof taskSchema>>;
  connections?: Array<z.infer<typeof connectionSchema>>;
}

function requireSpec(deps: WebMcpAdapterDeps): ComponentSpec {
  const spec = deps.getSpec();
  if (!spec) throw new Error("Open a pipeline before using this tool.");
  return spec;
}

function assertPort(
  spec: ComponentSpec,
  entityId: string,
  portName: string,
  direction: "input" | "output",
) {
  const task = spec.tasks.find((candidate) => candidate.$id === entityId);
  const ports =
    direction === "input"
      ? task?.resolvedComponentSpec?.inputs
      : task?.resolvedComponentSpec?.outputs;
  if (!task || !ports?.some((port) => port.name === portName)) {
    throw new Error(
      `Task ${entityId} has no ${direction} port named ${portName}.`,
    );
  }
}

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

export class WebMcpAdapter {
  readonly runStore: BrowserRunStore;
  private readonly bridge: ReturnType<typeof createCsomBridgeHandlers>;

  constructor(private readonly deps: WebMcpAdapterDeps) {
    this.runStore = deps.runStore ?? new BrowserRunStore();
    this.bridge = createCsomBridgeHandlers({
      getSpec: deps.getSpec,
      getActiveSubgraphPath: deps.getActiveSubgraphPath,
      undo: deps.undo,
    });
  }

  async getPipelineSummary() {
    const pipeline = await this.bridge.getPipelineState();
    return {
      name: pipeline.name,
      description: pipeline.description,
      taskCount: pipeline.tasks.length,
      bindingCount: pipeline.bindings.length,
      tasks: pipeline.tasks.slice(0, 40).map((task) => ({
        taskId: task.$id,
        name: task.name,
        componentId: componentIdFromUrl(task.componentRef.url),
        browserExecutable: componentIdFromUrl(task.componentRef.url) !== null,
        configuredArguments: task.arguments
          .filter((argument) => argument.value !== undefined)
          .map((argument) => argument.name),
      })),
      truncatedTaskCount: Math.max(0, pipeline.tasks.length - 40),
      activeSubgraphPath: pipeline.activeSubgraphPath,
      undoAvailable: this.deps.undo.canUndo,
    };
  }

  searchComponents(input: unknown) {
    const { query, limit } = z
      .object({
        query: z.string().max(120).default(""),
        limit: z.number().int().min(1).max(9).default(9),
      })
      .parse(input);
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results = CURATED_COMPONENTS.filter((component) => {
      const haystack =
        `${component.id} ${component.name} ${component.description} ${component.category}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
      .slice(0, limit)
      .map((component) => ({
        componentId: component.id,
        name: component.name,
        description: component.description,
        category: component.category,
        inputs: component.inputs.map((port) => port.name),
        outputs: component.outputs.map((port) => port.name),
        browserExecutable: true,
      }));
    return { resultCount: results.length, results };
  }

  addPipelineTasks(input: unknown) {
    const parsed = z
      .object({
        tasks: z.array(taskSchema).min(1).max(16),
        connections: z.array(connectionSchema).max(24).optional(),
      })
      .parse(input);
    const uniqueClientIds = new Set(parsed.tasks.map((task) => task.clientId));
    if (uniqueClientIds.size !== parsed.tasks.length) {
      throw new Error("Each task clientId must be unique within the batch.");
    }
    const spec = requireSpec(this.deps);
    const created: Array<{
      clientId: string;
      taskId: string;
      name: string;
      componentId: CuratedComponentId;
    }> = [];

    this.deps.undo.withGroup("WebMCP: add pipeline tasks", () => {
      const origin = computeNextPosition(spec);
      let preprocessingColumn = 0;
      let trainingLane = 0;
      let evaluationLane = 0;
      parsed.tasks.forEach((item, index) => {
        const component = CURATED_COMPONENT_BY_ID.get(item.componentId);
        if (!component)
          throw new Error(`Unsupported component: ${item.componentId}`);
        let position: { x: number; y: number };
        if (
          item.componentId === "load-csv" ||
          item.componentId === "select-columns" ||
          item.componentId === "fill-missing" ||
          item.componentId === "encode-categories" ||
          item.componentId === "train-test-split"
        ) {
          position = {
            x: origin.x + preprocessingColumn * 220,
            y: origin.y,
          };
          preprocessingColumn++;
        } else if (
          item.componentId === "logistic-regression" ||
          item.componentId === "decision-tree"
        ) {
          position = {
            x: origin.x + preprocessingColumn * 220,
            y: origin.y + (trainingLane++ === 0 ? -120 : 120),
          };
        } else if (item.componentId === "evaluate") {
          position = {
            x: origin.x + (preprocessingColumn + 1) * 220,
            y: origin.y + (evaluationLane++ === 0 ? -120 : 120),
          };
        } else if (item.componentId === "compare-metrics") {
          position = {
            x: origin.x + (preprocessingColumn + 2) * 220,
            y: origin.y,
          };
        } else {
          position = { x: origin.x + index * 220, y: origin.y };
        }
        const task = addTask(
          this.deps.undo,
          spec,
          createCuratedComponentReference(component),
          position,
        );
        if (item.name && item.name !== task.name) {
          if (!renameTask(this.deps.undo, spec, task.$id, item.name)) {
            throw new Error(
              `Could not use task name ${item.name}; names must be unique.`,
            );
          }
        }
        for (const [name, value] of Object.entries(item.configuration ?? {})) {
          const inputExists = task.resolvedComponentSpec?.inputs?.some(
            (port) => port.name === name,
          );
          if (!inputExists)
            throw new Error(
              `${component.name} has no configurable input named ${name}.`,
            );
          spec.setTaskArgument(task.$id, name, String(value));
        }
        created.push({
          clientId: item.clientId,
          taskId: task.$id,
          name: task.name,
          componentId: item.componentId,
        });
      });

      for (const connection of parsed.connections ?? []) {
        const source = created.find(
          (task) => task.clientId === connection.sourceClientId,
        );
        const target = created.find(
          (task) => task.clientId === connection.targetClientId,
        );
        if (!source || !target) {
          throw new Error(
            "Connections in a batch may only reference task clientIds from that batch.",
          );
        }
        assertPort(spec, source.taskId, connection.sourcePort, "output");
        assertPort(spec, target.taskId, connection.targetPort, "input");
        const connected = connectNodes(this.deps.undo, spec, {
          sourceNodeId: source.taskId,
          sourceHandleId: `output_${connection.sourcePort}`,
          targetNodeId: target.taskId,
          targetHandleId: `input_${connection.targetPort}`,
        });
        if (!connected)
          throw new Error("The requested connection is not valid.");
      }
    });

    return {
      success: true,
      undoLabel: "WebMCP: add pipeline tasks",
      created,
      connectionCount: parsed.connections?.length ?? 0,
    };
  }

  async configureTask(input: unknown) {
    const { taskId, inputName, value } = z
      .object({
        taskId: z.string().min(1).max(100),
        inputName: z.string().min(1).max(100),
        value: literalValueSchema,
      })
      .parse(input);
    return this.bridge.setTaskArgument(
      taskId,
      inputName,
      String(value) as ArgumentType,
    );
  }

  async connectTasks(input: unknown) {
    const { connections } = z
      .object({
        connections: z
          .array(
            z.object({
              sourceTaskId: z.string().min(1).max(100),
              sourcePort: z.string().min(1).max(100),
              targetTaskId: z.string().min(1).max(100),
              targetPort: z.string().min(1).max(100),
            }),
          )
          .min(1)
          .max(24),
      })
      .parse(input);
    const spec = requireSpec(this.deps);
    const results: Array<{
      success: boolean;
      bindingId?: string;
      error?: string;
    }> = [];
    this.deps.undo.withGroup("WebMCP: connect tasks", () => {
      for (const connection of connections) {
        assertPort(
          spec,
          connection.sourceTaskId,
          connection.sourcePort,
          "output",
        );
        assertPort(
          spec,
          connection.targetTaskId,
          connection.targetPort,
          "input",
        );
        const connected = connectNodes(this.deps.undo, spec, {
          sourceNodeId: connection.sourceTaskId,
          sourceHandleId: `output_${connection.sourcePort}`,
          targetNodeId: connection.targetTaskId,
          targetHandleId: `input_${connection.targetPort}`,
        });
        results.push({ success: connected });
      }
    });
    return { success: results.every((result) => result.success), results };
  }

  async validatePipeline() {
    const editor = await this.bridge.validatePipeline();
    const spec = requireSpec(this.deps);
    const unsupported = spec.tasks
      .filter((task) => componentIdFromUrl(task.componentRef.url) === null)
      .map((task) => ({ taskId: task.$id, name: task.name }));
    const classifiers = spec.tasks.filter((task) => {
      const id = componentIdFromUrl(task.componentRef.url);
      return id === "logistic-regression" || id === "decision-tree";
    });
    const browserIssues = [
      ...unsupported.map((task) => ({
        code: "UNSUPPORTED_BROWSER_COMPONENT",
        message: `${task.name} is not executable by the curated browser runner.`,
        taskId: task.taskId,
      })),
      ...(classifiers.length === 0
        ? [
            {
              code: "NO_BROWSER_CLASSIFIER",
              message: "Add a supported classifier before a local run.",
            },
          ]
        : []),
    ];
    return {
      editorValid: editor.valid,
      editorIssueCount: editor.issueCount,
      editorIssues: editor.issues.slice(0, 20),
      browserExecutable:
        editor.issues.every((issue) => issue.severity !== "error") &&
        browserIssues.length === 0,
      browserIssues,
    };
  }

  createPipelineSnapshot(): PipelineSnapshot {
    const spec = requireSpec(this.deps);
    return {
      name: spec.name,
      bindingCount: spec.bindings.length,
      tasks: spec.tasks.map((task) => ({
        id: task.$id,
        name: task.name,
        componentId: componentIdFromUrl(task.componentRef.url),
        arguments: Object.fromEntries(
          task.arguments.map((argument) => [argument.name, argument.value]),
        ),
      })),
    };
  }

  async runBrowserPipeline(agentInvoked: boolean) {
    const validation = await this.validatePipeline();
    if (!validation.browserExecutable) {
      throw new Error(
        `Pipeline cannot run locally: ${validation.browserIssues[0]?.message ?? "fix validation errors first."}`,
      );
    }
    return this.runStore.run(this.createPipelineSnapshot(), { agentInvoked });
  }

  getRunSummary() {
    const result = this.runStore.result;
    if (!result) {
      return {
        status: this.runStore.status,
        progress: this.runStore.progress,
        error: this.runStore.error,
      };
    }
    return {
      status: this.runStore.status,
      runId: result.runId,
      rows: {
        total: result.rowCount,
        train: result.trainRowCount,
        test: result.testRowCount,
      },
      seed: result.seed,
      durationMs: result.durationMs,
      preferredModelTaskId: result.preferredModelTaskId,
      preferredModelName: result.preferredModelName,
      selectionReason: result.selectionReason,
    };
  }

  inspectModelMetrics(input: unknown) {
    const { taskId } = z
      .object({ taskId: z.string().min(1).max(100).optional() })
      .parse(input);
    const result = this.runStore.result;
    if (!result) throw new Error("No completed browser run is available.");
    const models = taskId
      ? result.models.filter((model) => model.taskId === taskId)
      : result.models;
    if (models.length === 0)
      throw new Error(`No metrics found for task ${taskId}.`);
    return {
      runId: result.runId,
      priorityMetric: "recall",
      models: models.map((model) => ({
        ...model,
        metrics: {
          accuracy: round(model.metrics.accuracy),
          precision: round(model.metrics.precision),
          recall: round(model.metrics.recall),
          f1: round(model.metrics.f1),
          confusionMatrix: model.metrics.confusionMatrix,
        },
      })),
    };
  }

  async undoPipelineChange() {
    if (!this.deps.undo.canUndo)
      return { success: false, error: "There is no pipeline change to undo." };
    this.deps.undo.undo();
    return {
      success: true,
      remainingUndoLevels: this.deps.undo.undoLevels,
      pipeline: await this.getPipelineSummary(),
    };
  }
}
