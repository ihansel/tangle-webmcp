import type { PipelineSnapshot, RunnerProgress } from "../types";
import { executeBrowserPipeline } from "./engine";

interface RunMessage {
  type: "run";
  pipeline: PipelineSnapshot;
  datasetUrl: string;
}

self.onmessage = async (event: MessageEvent<RunMessage>) => {
  if (event.data.type !== "run") return;
  try {
    const response = await fetch(event.data.datasetUrl);
    if (!response.ok)
      throw new Error(`Could not load local dataset (${response.status}).`);
    const csvText = await response.text();
    const result = await executeBrowserPipeline(event.data.pipeline, csvText, {
      onProgress: (value: RunnerProgress) =>
        self.postMessage({ type: "progress", value }),
    });
    self.postMessage({ type: "complete", value: result });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "Browser run failed.",
    });
  }
};
