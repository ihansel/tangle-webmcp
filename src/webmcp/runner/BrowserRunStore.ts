import { makeAutoObservable, observable, runInAction } from "mobx";

import type {
  BrowserRunResult,
  PipelineSnapshot,
  RunnerProgress,
} from "../types";

export type BrowserRunStatus =
  "idle" | "ready" | "running" | "completed" | "failed" | "cancelled";

export class BrowserRunStore {
  status: BrowserRunStatus = "idle";
  progress: RunnerProgress | null = null;
  result: BrowserRunResult | null = null;
  error: string | null = null;
  agentRunAuthorized = false;
  lastToolName: string | null = null;
  private worker: Worker | null = null;

  constructor() {
    makeAutoObservable<this, "worker">(
      this,
      { worker: false, progress: observable.ref, result: observable.ref },
      { autoBind: true },
    );
  }

  authorizeAgentRun() {
    this.agentRunAuthorized = true;
    if (this.status === "idle") this.status = "ready";
  }

  recordToolCall(name: string) {
    this.lastToolName = name;
  }

  async run(
    pipeline: PipelineSnapshot,
    options: { agentInvoked: boolean },
  ): Promise<BrowserRunResult> {
    if (this.status === "running")
      throw new Error("A browser run is already in progress.");
    if (options.agentInvoked && !this.agentRunAuthorized) {
      throw new Error(
        "User confirmation required: choose Allow next agent run in the visible browser-runner panel.",
      );
    }
    this.agentRunAuthorized = false;
    this.status = "running";
    this.progress = {
      phase: "loading",
      percent: 0,
      message: "Starting local worker",
    };
    this.result = null;
    this.error = null;

    const loadTask = pipeline.tasks.find(
      (task) => task.componentId === "load-csv",
    );
    const configuredPath = String(
      loadTask?.arguments.dataset_path ?? "/datasets/equipment-failure.csv",
    );
    const datasetPath = configuredPath.startsWith("/")
      ? configuredPath.slice(1)
      : configuredPath;

    return new Promise<BrowserRunResult>((resolve, reject) => {
      const worker = new Worker(
        new URL("./browserRunner.worker.ts", import.meta.url),
        {
          type: "module",
        },
      );
      this.worker = worker;
      worker.onmessage = (event: MessageEvent) => {
        if (event.data.type === "progress") {
          runInAction(() => {
            this.progress = event.data.value as RunnerProgress;
          });
          return;
        }
        if (event.data.type === "complete") {
          const result = event.data.value as BrowserRunResult;
          runInAction(() => {
            this.result = result;
            this.status = "completed";
            this.progress = null;
            this.disposeWorker();
          });
          resolve(result);
          return;
        }
        if (event.data.type === "error") {
          const message = String(event.data.error);
          runInAction(() => {
            this.error = message;
            this.status = "failed";
            this.progress = null;
            this.disposeWorker();
          });
          reject(new Error(message));
        }
      };
      worker.onerror = (event) => {
        const message =
          event.message || "The browser worker stopped unexpectedly.";
        runInAction(() => {
          this.error = message;
          this.status = "failed";
          this.progress = null;
          this.disposeWorker();
        });
        reject(new Error(message));
      };
      worker.postMessage({
        type: "run",
        pipeline,
        datasetUrl: `${import.meta.env.BASE_URL}${datasetPath}`,
        hostedProfileBaseUrl: `${import.meta.env.BASE_URL}api/buyer-profile`,
      });
    });
  }

  cancel() {
    if (this.status !== "running") return;
    this.disposeWorker();
    this.status = "cancelled";
    this.progress = null;
    this.error = "Run cancelled by the user.";
  }

  private disposeWorker() {
    this.worker?.terminate();
    this.worker = null;
  }
}
