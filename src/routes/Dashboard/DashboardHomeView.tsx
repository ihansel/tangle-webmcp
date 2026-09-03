import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getDefaultEditorPath } from "@/routes/editorRoutes";
import { writeComponentToFileListFromText } from "@/utils/componentStore";
import {
  defaultPipelineYamlWithName,
  USER_PIPELINES_LIST_NAME,
} from "@/utils/constants";
import {
  DEMO_RECIPES,
  type DemoRecipe,
  type DemoRecipeId,
} from "@/webmcp/demoRecipes";
import { queueDemoRecipe } from "@/webmcp/pendingDemoRecipe";

const accentClasses = {
  violet: "bg-violet-500/15 text-violet-300 border-violet-400/20",
  mint: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  amber: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  sky: "bg-sky-500/15 text-sky-300 border-sky-400/20",
};

function WorkflowPreview() {
  const steps = [
    {
      icon: "Database" as const,
      label: "Northstar commerce",
      detail: "1,800 customers",
    },
    {
      icon: "SlidersHorizontal" as const,
      label: "Connect behaviour",
      detail: "19,840 orders",
    },
    {
      icon: "GitCompareArrows" as const,
      label: "Run three analyses",
      detail: "segments · churn · products",
    },
  ];

  return (
    <div className="relative min-h-[400px] overflow-hidden border-l border-white/10 bg-[#111114] p-6 lg:p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Agent-built commerce brief
          </p>
          <p className="mt-1 text-sm font-medium text-slate-200">
            Northstar customer intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Browser ready
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.label}>
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3.5">
              <div className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300">
                <Icon name={step.icon} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{step.detail}</p>
              </div>
              <span className="font-mono text-[10px] text-slate-600">
                0{index + 1}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="ml-8 h-3 w-px bg-white/15" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
          <p className="text-xs text-emerald-300">Decision-ready outputs</p>
          <p className="mt-1 text-base font-semibold text-white">
              18 charts, tables and reports
            </p>
          </div>
          <div className="grid size-10 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Icon name="Check" size="lg" />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-500">
        <Icon name="ShieldCheck" size="sm" className="text-violet-300" />
        Visible actions · one-run permission · normal Tangle undo
      </div>
    </div>
  );
}

function RecipeRow({
  recipe,
  loading,
  onLaunch,
}: {
  recipe: DemoRecipe;
  loading: boolean;
  onLaunch: (recipe: DemoRecipe) => void;
}) {
  return (
    <article className="group grid gap-5 border-t border-slate-800 py-6 transition-colors hover:bg-white/[0.02] md:grid-cols-[210px_1fr_auto] md:items-center md:px-4">
      <div className="flex items-center gap-3">
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-lg border ${accentClasses[recipe.accent]}`}
        >
          <Icon name={recipe.icon} size="lg" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {recipe.eyebrow}
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {recipe.shortTitle}
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-slate-100">
          {recipe.title}
        </h3>
        <p className="mt-1.5 text-sm leading-6 text-slate-400">
          {recipe.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          {recipe.steps.map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              {index > 0 && <Icon name="ArrowRight" size="xs" />}
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 md:justify-end">
        <p className="hidden max-w-40 text-right text-xs leading-5 text-slate-500 xl:block">
          {recipe.outcome}
        </p>
        <Button
          variant="outline"
          className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-white"
          onClick={() => onLaunch(recipe)}
          disabled={loading}
        >
          {loading ? "Building…" : "Open experiment"}
          {!loading && <Icon name="ArrowUpRight" size="sm" />}
        </Button>
      </div>
    </article>
  );
}

export function DashboardHomeView() {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState<DemoRecipeId | null>(null);

  const launchRecipe = async (recipe: DemoRecipe) => {
    if (launching) return;
    setLaunching(recipe.id);
    const suffix = Date.now().toString(36).slice(-5);
    const pipelineName = `${recipe.pipelineName} ${suffix}`;
    try {
      await writeComponentToFileListFromText(
        USER_PIPELINES_LIST_NAME,
        pipelineName,
        defaultPipelineYamlWithName(pipelineName),
      );
      queueDemoRecipe({ pipelineName, recipeId: recipe.id });
      await navigate({ to: getDefaultEditorPath(pipelineName) });
    } finally {
      setLaunching(null);
    }
  };

  const scrollToRecipes = () =>
    document
      .getElementById("demo-recipes")
      ?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="mx-auto w-full max-w-[1440px] pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b0b0d] text-white shadow-2xl shadow-black/15">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex min-h-[400px] flex-col justify-between p-7 sm:p-10 lg:p-12">
            <div>
              <div className="mb-8 flex items-center gap-2 text-xs font-medium text-slate-400">
                <span className="size-2 rounded-full bg-violet-400" />
                WebMCP-enabled workspace
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl">
                A commerce story agents can build, run and explain.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
                Explore one synthetic retailer across customer segments, churn
                risk and product relationships. Every graph is assembled
                through WebMCP and runs without sending rows away.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-violet-500 text-white shadow-none hover:bg-violet-400"
                  onClick={() => launchRecipe(DEMO_RECIPES[2])}
                  disabled={launching !== null}
                >
                  {launching === "segments"
                    ? "Building pipeline…"
                    : "Explore customer segments"}
                  {launching !== "segments" && <Icon name="ArrowRight" />}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-white"
                  onClick={scrollToRecipes}
                >
                  Browse experiments
                </Button>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-5">
              {[
                ["61k+", "commerce events"],
                ["18", "visual outputs"],
                ["100%", "local analysis"],
              ].map(([value, label]) => (
                <div key={label} className="px-4 first:pl-0">
                  <p className="text-lg font-semibold text-slate-100">
                    {value}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <WorkflowPreview />
        </div>
      </section>

      <section className="mt-8 grid overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white lg:grid-cols-[1.1fr_1.9fr]">
        <div className="border-b border-slate-800 p-6 lg:border-r lg:border-b-0 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
            One connected dataset
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Meet Northstar Outdoor Co.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            A deterministic, privacy-safe retailer with two years of purchase
            history, overlapping customer behaviours, probabilistic churn and
            product co-purchase relationships.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-800 sm:grid-cols-4 sm:divide-y-0">
          {[
            ["1,800", "customers"],
            ["19,840", "orders"],
            ["41,626", "line items"],
            ["160", "products"],
          ].map(([value, label]) => (
            <div key={label} className="flex min-h-28 flex-col justify-end p-5 lg:p-6">
              <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo-recipes" className="scroll-mt-6 px-1 pt-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Choose an experiment
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Each recipe opens as a real Tangle graph. Edit the tasks, ask an
              agent to inspect it, then run the workload locally.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="Laptop" size="sm" />
            No backend or API key required
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 px-5 sm:px-6">
          {DEMO_RECIPES.map((recipe) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              loading={launching === recipe.id}
              onLaunch={launchRecipe}
            />
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 border-t border-border px-1 pt-8 md:grid-cols-[220px_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-500">
            Why WebMCP
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Agentic work you can see and control
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            [
              "MousePointerClick",
              "Visible changes",
              "Agents edit the same graph you do. Every task and connection appears on the canvas.",
            ],
            [
              "ShieldCheck",
              "Permission at the edge",
              "Graph edits are undoable. Browser runs require explicit one-time permission.",
            ],
            [
              "Cpu",
              "Useful local compute",
              "Models, clusters, and vectors run in a cancellable worker without sending rows away.",
            ],
          ].map(([icon, title, copy]) => (
            <div key={title}>
              <Icon name={icon as "Cpu"} className="text-violet-500" />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {copy}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
