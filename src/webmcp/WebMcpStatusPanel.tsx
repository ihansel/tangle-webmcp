import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import type { WebMcpRegistrationState } from "./useWebMcp";
import type { WebMcpAdapter } from "./WebMcpAdapter";

interface WebMcpStatusPanelProps {
  adapter: WebMcpAdapter;
  registration: WebMcpRegistrationState;
}

function percentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

export const WebMcpStatusPanel = observer(function WebMcpStatusPanel({
  adapter,
  registration,
}: WebMcpStatusPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const run = adapter.runStore;
  const modelContextLabel = registration.registered
    ? `${registration.toolCount} tools shared`
    : registration.available
      ? "Registration issue"
      : "Browser tools unavailable";

  const handleManualRun = () => {
    void adapter.runBrowserPipeline(false).catch(() => undefined);
  };

  return (
    <aside
      className="z-20 m-3 ml-0 w-[340px] shrink-0 self-start overflow-hidden rounded-lg border border-slate-300 bg-white/95 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/95"
      aria-label="WebMCP browser runner"
      data-testid="webmcp-status-panel"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              registration.registered ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          <span className="min-w-0">
            <Text as="span" size="sm" weight="semibold" className="block">
              WebMCP local runner
            </Text>
            <Text as="span" size="xs" tone="subdued" className="block truncate">
              {modelContextLabel}
            </Text>
          </span>
        </span>
        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          className="size-4"
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
          <div className="mb-3 grid gap-2">
            <div>
              <Text
                as="span"
                size="xs"
                tone="subdued"
                className="block uppercase tracking-wide"
              >
                Local data only
              </Text>
              <Text
                as="span"
                size="sm"
                weight="medium"
                className="block capitalize"
              >
                {run.status.replace("_", " ")}
              </Text>
            </div>
            {run.status === "running" ? (
              <Button
                className="w-full"
                size="xs"
                variant="outline"
                onClick={run.cancel}
              >
                Cancel
              </Button>
            ) : (
              <Button className="w-full" size="xs" onClick={handleManualRun}>
                Run locally
              </Button>
            )}
          </div>

          {run.progress && (
            <div className="mb-3" aria-live="polite">
              <div className="mb-1 flex justify-between gap-2">
                <Text size="xs" tone="subdued">
                  {run.progress.message}
                </Text>
                <Text size="xs" font="mono">
                  {run.progress.percent}%
                </Text>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-600 transition-[width]"
                  style={{ width: `${run.progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {!run.agentRunAuthorized && run.status !== "running" && (
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2 text-left text-xs text-blue-900 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
              onClick={run.authorizeAgentRun}
            >
              <span>Allow the next agent-triggered run</span>
              <Icon name="ShieldCheck" className="size-4" />
            </button>
          )}
          {run.agentRunAuthorized && (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              Next agent-triggered run authorised once
            </div>
          )}

          {run.error && (
            <div className="mb-3 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
              {run.error}
            </div>
          )}

          {run.result && (
            <div className="space-y-2" data-testid="browser-run-results">
              <div className="grid grid-cols-2 gap-2">
                {run.result.models.map((model) => (
                  <div
                    key={model.taskId}
                    className={cn(
                      "rounded-md border px-2.5 py-2",
                      model.taskId === run.result?.preferredModelTaskId
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                        : "border-slate-200 dark:border-slate-800",
                    )}
                  >
                    <Text
                      size="xs"
                      weight="semibold"
                      className="block truncate"
                      title={model.taskName}
                    >
                      {model.taskName}
                    </Text>
                    <Text size="xs" tone="subdued" className="block">
                      Recall {percentage(model.metrics.recall)}
                    </Text>
                    <Text size="xs" tone="subdued" className="block">
                      F1 {percentage(model.metrics.f1)}
                    </Text>
                  </div>
                ))}
              </div>
              <div className="rounded-md bg-slate-100 px-2.5 py-2 dark:bg-slate-900">
                <Text size="xs" weight="semibold" className="block">
                  Preferred: {run.result.preferredModelName}
                </Text>
                <Text
                  size="xs"
                  tone="subdued"
                  className="mt-1 block leading-relaxed"
                >
                  {run.result.selectionReason}
                </Text>
              </div>
            </div>
          )}

          {run.lastToolName && (
            <Text
              size="xs"
              tone="subdued"
              className="mt-3 block border-t border-slate-200 pt-2 dark:border-slate-800"
            >
              Last agent action: {run.lastToolName}
            </Text>
          )}
        </div>
      )}
    </aside>
  );
});
