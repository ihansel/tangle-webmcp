import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { StrandLogo, StrandMark } from "@/components/brand/StrandLogo";
import { Icon, type IconName } from "@/components/ui/icon";
import { TANGLE_UI_REPO_URL } from "@/utils/constants";

import pipelineImage from "../../../submission/assets/gallery/02-product2vec-pipeline.png";
import churnReportImage from "../../../submission/assets/gallery/05-churn-classifiers-report.png";
import clusterReportImage from "../../../submission/assets/gallery/06-customer-clusters-report.png";
import { getCurrentRootExperience } from "./browserContext";

const workflowSteps: Array<{
  icon: IconName;
  number: string;
  title: string;
  copy: string;
}> = [
  {
    icon: "MessageSquareText",
    number: "01",
    title: "Ask in plain language",
    copy: "Describe the result you need: a churn check, forecast, prediction or useful customer groups.",
  },
  {
    icon: "GitBranch",
    number: "02",
    title: "See the workflow",
    copy: "The agent edits the same visual graph you see. Inspect the data, models and connections as they appear.",
  },
  {
    icon: "ShieldCheck",
    number: "03",
    title: "Approve and run",
    copy: "Nothing executes until you allow it. Results return as charts, comparisons and clear next steps.",
  },
];

const examples = [
  {
    title: "Product relationships",
    detail: "Build a small embedding model from purchase patterns.",
    image: pipelineImage,
    alt: "Strand canvas showing a three-step product embedding workflow",
    className: "lg:col-span-7",
  },
  {
    title: "Customer groups",
    detail: "Find and explain meaningful shopping behaviours.",
    image: clusterReportImage,
    alt: "Customer clustering report with a scatterplot and comparison heatmap",
    className: "lg:col-span-5",
  },
  {
    title: "Churn prediction",
    detail: "Compare models, thresholds and the value of intervention.",
    image: churnReportImage,
    alt: "Customer churn report with confusion matrix, curves and risk drivers",
    className: "lg:col-span-12",
  },
];

function buildCodexDeepLink() {
  const appUrl = `${window.location.origin}/?view=app`;
  const prompt = `Open ${appUrl} in the Codex browser and help me try Strand's retail machine-learning workflows through WebMCP.`;
  return `codex://threads/new?prompt=${encodeURIComponent(prompt)}`;
}

function ArrowLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
    >
      {children}
      <Icon
        name="ArrowUpRight"
        size="sm"
        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </a>
  );
}

function ProductFrame() {
  return (
    <div className="relative mx-auto w-full max-w-[760px] lg:mr-0">
      <div className="absolute -inset-4 -z-10 rounded-[28px] bg-violet-500/10 blur-3xl" />
      <div className="overflow-hidden rounded-xl border border-white/15 bg-[#111116] shadow-2xl shadow-black/50">
        <div className="flex h-10 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2 rounded-full bg-slate-700" />
            <span className="size-2 rounded-full bg-slate-700" />
            <span className="size-2 rounded-full bg-violet-400" />
          </div>
          <p className="text-xs text-slate-500">
            Product relationships · Strand
          </p>
          <span className="flex items-center gap-1.5 text-xs text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            local
          </span>
        </div>
        <img
          src={pipelineImage}
          alt="Strand's visual canvas showing a product embedding workflow"
          className="aspect-[3/2] w-full object-cover object-center"
        />
      </div>
      <div className="relative -mt-7 ml-auto mr-4 w-[min(90%,470px)] rounded-lg border border-white/15 bg-[#111116]/95 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur sm:mr-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-white">Ask in chat</span>
          <Icon name="ArrowRight" size="xs" className="text-slate-600" />
          <span className="font-medium text-white">Review the graph</span>
          <Icon name="ArrowRight" size="xs" className="text-slate-600" />
          <span className="font-medium text-emerald-300">Approve the run</span>
        </div>
      </div>
    </div>
  );
}

export function PublicLandingView() {
  const codexDeepLink = buildCodexDeepLink();

  return (
    <div
      className="min-h-screen overflow-hidden bg-[#09090b] text-white"
      data-root-experience="overview"
    >
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-18 max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#top" aria-label="Strand home" className="shrink-0">
            <StrandLogo tone="light" />
          </a>
          <nav
            className="hidden items-center gap-7 text-sm text-slate-400 md:flex"
            aria-label="Landing page"
          >
            <a className="transition hover:text-white" href="#how-it-works">
              How it works
            </a>
            <a className="transition hover:text-white" href="#examples">
              Examples
            </a>
            <a className="transition hover:text-white" href="#runtime">
              What runs where
            </a>
          </nav>
          <a
            href={codexDeepLink}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:border-violet-400/60 hover:bg-violet-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            Open in Codex
            <Icon name="ArrowUpRight" size="sm" />
          </a>
        </div>
      </header>

      <main id="top">
        <section className="relative border-b border-white/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,rgba(124,58,237,0.12),transparent_34%)]" />
          <div className="relative mx-auto grid max-w-[1480px] gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-12 lg:py-28">
            <div className="max-w-2xl">
              <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl xl:text-[76px]">
                Ask for an ML workflow. Watch it take shape.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
                Strand lets an agent build predictions, churn checks, forecasts
                and customer groups on a visible Tangle canvas. You review every
                step, approve the run and keep the result.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ArrowLink href={codexDeepLink}>Open in Codex</ArrowLink>
                <Link
                  to="/dashboard"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  Explore the app
                  <Icon name="ArrowRight" size="sm" />
                </Link>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Icon name="Sparkles" size="sm" className="text-violet-300" />
                Works best with WebMCP in Codex or ChatGPT.
              </p>
            </div>
            <ProductFrame />
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-20 border-b border-white/10 bg-[#0d0d10]"
        >
          <div className="mx-auto max-w-[1480px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-8 lg:grid-cols-[0.42fr_1.58fr] lg:gap-16">
              <div>
                <p className="text-sm font-semibold text-violet-300">
                  How WebMCP helps
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  The agent and the interface stay in sync.
                </h2>
              </div>
              <div className="grid border-y border-white/10 md:grid-cols-3 md:divide-x md:divide-white/10">
                {workflowSteps.map((step) => (
                  <article
                    key={step.number}
                    className="border-b border-white/10 py-7 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
                  >
                    <div className="flex items-center justify-between">
                      <Icon name={step.icon} className="text-violet-300" />
                      <span className="font-mono text-xs text-slate-600">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-3 text-base leading-7 text-slate-400">
                      {step.copy}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="examples"
          className="scroll-mt-20 border-b border-white/10"
        >
          <div className="mx-auto max-w-[1480px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  Retail examples, real workflows
                </p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                  Move from a business question to evidence you can inspect.
                </h2>
              </div>
              <p className="max-w-md text-base leading-7 text-slate-400">
                The Northstar demo includes synthetic customers, orders,
                products and two years of daily sales—enough to tell a useful
                story without exposing real customer data.
              </p>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-12">
              {examples.map((example) => (
                <figure key={example.title} className={example.className}>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111116]">
                    <img
                      src={example.image}
                      alt={example.alt}
                      className="aspect-[3/2] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <figcaption className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <span className="text-base font-semibold text-white">
                      {example.title}
                    </span>
                    <span className="text-sm text-slate-500">
                      {example.detail}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="runtime" className="scroll-mt-20 bg-[#0d0d10]">
          <div className="mx-auto max-w-[1480px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
              <div>
                <p className="text-sm font-semibold text-violet-300">
                  What runs where
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  Clear boundaries for data and compute.
                </h2>
                <p className="mt-5 text-base leading-7 text-slate-400">
                  Strand shows whether a step runs locally or calls a protected
                  service before anything happens.
                </p>
              </div>
              <div className="divide-y divide-white/10 border-y border-white/10">
                <div className="grid gap-4 py-7 sm:grid-cols-[220px_1fr]">
                  <div className="flex items-center gap-3 font-semibold text-emerald-300">
                    <Icon name="Laptop" />
                    In your browser
                  </div>
                  <p className="text-base leading-7 text-slate-400">
                    Data preparation, clustering, classifiers, embeddings and
                    forecasts. Your rows stay on the device.
                  </p>
                </div>
                <div className="grid gap-4 py-7 sm:grid-cols-[220px_1fr]">
                  <div className="flex items-center gap-3 font-semibold text-sky-300">
                    <Icon name="Cloud" />
                    Protected endpoint
                  </div>
                  <p className="text-base leading-7 text-slate-400">
                    Optional fine-tuned profile models. Credentials stay in a
                    trusted local or server process, never in the page or
                    canvas.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-20 grid overflow-hidden rounded-xl border border-violet-400/25 bg-violet-500/[0.09] lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="p-7 sm:p-10 lg:p-12">
                <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  Build with the agent. Keep the work visible.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                  Start with a retail example, change the workflow together and
                  inspect the result on the same canvas.
                </p>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/10 p-7 sm:flex-row lg:border-l lg:border-t-0 lg:p-10">
                <ArrowLink href={codexDeepLink}>Open in Codex</ArrowLink>
                <Link
                  to="/dashboard"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.05]"
                >
                  Explore in browser
                </Link>
              </div>
            </div>

            <footer className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <StrandMark className="size-7" />
                Independent WebMCP experiment built on Tangle.
              </div>
              <a
                href={TANGLE_UI_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-white underline-offset-4 hover:underline"
              >
                View upstream Tangle →
              </a>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}

export function AdaptiveHomeView() {
  const [experience] = useState(getCurrentRootExperience);
  const navigate = useNavigate();

  useEffect(() => {
    if (experience === "app") {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [experience, navigate]);

  if (experience === "app") {
    return (
      <div
        className="grid min-h-screen place-items-center bg-background"
        data-root-experience="app"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <StrandMark className="size-7 animate-pulse" />
          Opening your Strand workspace…
        </div>
      </div>
    );
  }

  return <PublicLandingView />;
}
