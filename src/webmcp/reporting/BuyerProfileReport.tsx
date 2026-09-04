import { Icon } from "@/components/ui/icon";

import type { BuyerProfileRunResult } from "../types";
import {
  ChartCell,
  ChartLegend,
  chartPoint,
  REPORT_COLORS,
} from "./ChartPrimitives";

function ScoreRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr_44px] items-center gap-3 text-xs">
      <span className="truncate text-slate-400">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: color,
          }}
        />
      </div>
      <span className="text-right font-mono text-slate-200">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function LossChart({ result }: { result: BuyerProfileRunResult }) {
  const points = result.lossCurve;
  if (points.length < 2)
    return (
      <p className="text-sm text-slate-500">No loss history was recorded.</p>
    );
  const losses = points.map((point) => point.loss);
  const min = Math.min(...losses);
  const max = Math.max(...losses);
  const maxStep = Math.max(...points.map((point) => point.step));
  const path = points
    .map((point, index) => {
      const x = chartPoint(point.step, 0, maxStep, 18, 382);
      const y = chartPoint(point.loss, min, max, 122, 18);
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div>
      <svg
        viewBox="0 0 400 145"
        className="h-44 w-full"
        role="img"
        aria-label="Fine-tuning loss over training steps"
      >
        {[18, 70, 122].map((y) => (
          <line
            key={y}
            x1="18"
            x2="382"
            y1={y}
            y2={y}
            stroke="#293042"
            strokeWidth="1"
          />
        ))}
        <path d={path} fill="none" stroke={REPORT_COLORS[0]} strokeWidth="3" />
        {points.map((point) => (
          <circle
            key={point.step}
            cx={chartPoint(point.step, 0, maxStep, 18, 382)}
            cy={chartPoint(point.loss, min, max, 122, 18)}
            r="3"
            fill="#09090c"
            stroke={REPORT_COLORS[0]}
            strokeWidth="2"
          />
        ))}
        <text x="18" y="140" fill="#64748b" fontSize="10">
          step {points[0].step}
        </text>
        <text x="382" y="140" textAnchor="end" fill="#64748b" fontSize="10">
          step {points.at(-1)?.step}
        </text>
      </svg>
      <ChartLegend
        items={[{ label: "Observed training loss", color: REPORT_COLORS[0] }]}
      />
    </div>
  );
}

export function BuyerProfileReport({
  result,
}: {
  result: BuyerProfileRunResult;
}) {
  const scores = [
    { key: "base", score: result.scorecard.base, color: REPORT_COLORS[3] },
    {
      key: "student",
      score: result.scorecard.student,
      color: REPORT_COLORS[1],
    },
    {
      key: "teacher",
      score: result.scorecard.teacher,
      color: REPORT_COLORS[0],
    },
  ] as const;
  const lift =
    result.scorecard.student.judgeScore - result.scorecard.base.judgeScore;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [result.trainingExamples.toLocaleString(), "teacher examples"],
          [`${result.trainingMinutes.toFixed(1)} min`, "fine-tuning time"],
          [`${lift >= 0 ? "+" : ""}${lift.toFixed(1)}`, "score improvement"],
          [`${result.profilesPerSecond.toFixed(1)}/s`, "measured throughput"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-[#111116] p-4"
          >
            <p className="text-2xl font-semibold tracking-tight text-white">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCell
          title="Base model vs fine-tuned student"
          subtitle="Held-out score combines valid JSON, exact profile labels, and evidence copied from the customer timeline."
        >
          <div className="space-y-5">
            {scores.map(({ key, score, color }) => (
              <div
                key={key}
                className="space-y-2.5 border-b border-slate-800 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-200">
                    {score.name}
                  </p>
                  <p className="font-mono text-sm text-white">
                    {score.judgeScore.toFixed(1)}
                  </p>
                </div>
                <ScoreRow
                  label="Valid schema"
                  value={score.schemaValidity * 100}
                  color={color}
                />
                <ScoreRow
                  label="Correct labels"
                  value={score.labelAccuracy * 100}
                  color={color}
                />
                <ScoreRow
                  label="Grounded evidence"
                  value={score.evidenceGrounding * 100}
                  color={color}
                />
              </div>
            ))}
          </div>
        </ChartCell>
        <ChartCell
          title="The actual learning curve"
          subtitle={`${result.maxSteps} capped LoRA steps on ${result.model}; the line uses trainer logs rather than a staged animation.`}
        >
          <LossChart result={result} />
        </ChartCell>
      </div>

      <ChartCell
        title="Where fine-tuning helped"
        subtitle="Scores on difficult held-out customer slices; every bar is based on generated JSON, not the training labels alone."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {result.slices.map((slice) => (
            <div key={slice.label}>
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {slice.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {slice.count} held-out examples
                  </p>
                </div>
                <p className="font-mono text-xs text-emerald-300">
                  +
                  {Math.max(0, slice.studentScore - slice.baseScore).toFixed(1)}
                </p>
              </div>
              <div className="space-y-2">
                <ScoreRow
                  label="Base"
                  value={slice.baseScore}
                  color={REPORT_COLORS[3]}
                />
                <ScoreRow
                  label="Fine-tuned"
                  value={slice.studentScore}
                  color={REPORT_COLORS[1]}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartCell>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Generated buyer profiles
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Live outputs from the hosted adapter. Evidence chips are exact
              input signals the model cited.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            {result.cacheHits} of {result.profiles.length} served from the
            public demo cache
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {result.profiles.map((profile) => (
            <article
              key={profile.customerId}
              className="rounded-xl border border-slate-800 bg-[#111116] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-violet-300">
                    {profile.customerId}
                  </p>
                  <h4 className="mt-1 text-base font-semibold capitalize text-white">
                    {profile.lifecycleStage} · {profile.churnRisk} churn risk
                  </h4>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <Icon
                    name={profile.valid ? "BadgeCheck" : "CircleAlert"}
                    size="sm"
                  />
                  {profile.valid ? "Valid JSON" : "Needs review"}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {profile.summary}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-slate-800 pt-4 text-xs">
                <div>
                  <dt className="text-slate-500">Buying rhythm</dt>
                  <dd className="mt-1 capitalize text-slate-200">
                    {profile.purchaseCadence}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Price sensitivity</dt>
                  <dd className="mt-1 capitalize text-slate-200">
                    {profile.priceSensitivity}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Suggested next action</dt>
                  <dd className="mt-1 text-slate-200">
                    {profile.nextBestAction}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.evidence.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-400"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-right font-mono text-[10px] text-slate-600">
                {profile.latencyMs.toLocaleString()} ms
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="flex gap-3 rounded-xl border border-emerald-900/70 bg-emerald-950/35 p-4">
        <Icon name="ShieldCheck" className="mt-0.5 shrink-0 text-emerald-300" />
        <div>
          <p className="text-sm font-semibold text-emerald-100">
            A bounded hosted run
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-200/70">
            Only the fixed synthetic demo IDs can reach Modal. Training is not
            exposed publicly, model access is proxy-authenticated, and generated
            results are cached to cap GPU use.
          </p>
        </div>
      </div>
    </div>
  );
}
