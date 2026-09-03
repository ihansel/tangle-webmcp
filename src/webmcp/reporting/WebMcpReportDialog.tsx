import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

import type { BrowserRunResult } from "../types";
import { ClassificationReport } from "./ClassificationReport";
import { ClusteringReport } from "./ClusteringReport";
import { EmbeddingReport } from "./EmbeddingReport";

const titles = {
  classification: "Customer churn report",
  clustering: "Customer segmentation report",
  embedding: "Product intelligence report",
};

const descriptions = {
  classification:
    "Model quality, risk drivers, priority customers, and the commercial value of intervention.",
  clustering:
    "Segment shape, relative value, defining behaviours, representative customers, and recommended actions.",
  embedding:
    "Embedding training, learned neighbours, category cohesion, co-purchase structure, and bundle opportunities.",
};

export function WebMcpReportDialog({ result }: { result: BrowserRunResult }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="xs"
          variant="outline"
          className="mt-3 w-full border-violet-500/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
        >
          <Icon name="ChartNoAxesCombined" size="sm" />
          Open full analysis report
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[min(900px,calc(100vh-2rem))] max-w-[1180px] flex-col gap-0 overflow-hidden border-slate-800 bg-[#09090c] p-0 text-white sm:!max-w-[1180px]">
        <DialogHeader className="shrink-0 border-b border-slate-800 px-6 py-5 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl tracking-tight text-white">
                {titles[result.kind]}
              </DialogTitle>
              <DialogDescription className="mt-1.5 max-w-3xl leading-6 text-slate-400">
                {descriptions[result.kind]}
              </DialogDescription>
            </div>
            <div className="flex gap-5 text-right">
              <div>
                <p className="text-lg font-semibold text-white">
                  {result.rowCount.toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  records
                </p>
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-300">
                  {result.durationMs.toLocaleString()} ms
                </p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  local runtime
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {result.kind === "classification" ? (
            <ClassificationReport result={result} />
          ) : result.kind === "clustering" ? (
            <ClusteringReport result={result} />
          ) : (
            <EmbeddingReport result={result} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
