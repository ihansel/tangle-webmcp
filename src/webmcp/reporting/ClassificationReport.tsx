import type { ClassificationRunResult } from "../types";
import {
  ChartCell,
  ChartLegend,
  chartPoint,
  currency,
  percent,
  REPORT_COLORS,
} from "./ChartPrimitives";

export function ClassificationReport({
  result,
}: {
  result: ClassificationRunResult;
}) {
  const preferred =
    result.models.find(
      (model) => model.taskId === result.preferredModelTaskId,
    ) ?? result.models[0];
  const matrix = preferred.metrics.confusionMatrix;
  const matrixMax = Math.max(
    1,
    matrix.truePositive,
    matrix.falsePositive,
    matrix.trueNegative,
    matrix.falseNegative,
  );
  const maxRiskCount = Math.max(
    1,
    ...result.riskDistribution.map((bucket) => bucket.count),
  );
  const maxNetValue = Math.max(
    1,
    ...result.interventionCurve.map((point) => point.netValue),
  );
  const linePath = result.interventionCurve
    .map((point, index) => {
      const x = chartPoint(
        point.customers,
        0,
        result.interventionCurve.at(-1)?.customers ?? 1,
        28,
        292,
      );
      const y = chartPoint(point.netValue, 0, maxNetValue, 142, 18);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCell
        title="Confusion matrix"
        subtitle={`${preferred.taskName} at the selected operating threshold`}
      >
        <div className="grid grid-cols-[72px_repeat(2,1fr)] gap-2 text-center text-xs">
          <span />
          <span className="text-slate-500">Predicted stay</span>
          <span className="text-slate-500">Predicted churn</span>
          <span className="self-center text-left text-slate-500">
            Actual stay
          </span>
          {[
            ["True negative", matrix.trueNegative, REPORT_COLORS[1]],
            ["False positive", matrix.falsePositive, REPORT_COLORS[2]],
          ].map(([label, value, color]) => (
            <div
              key={String(label)}
              className="rounded-lg border border-white/5 px-2 py-4"
              style={{
                backgroundColor: `${color}${Math.max(
                  20,
                  Math.round((Number(value) / matrixMax) * 170),
                )
                  .toString(16)
                  .padStart(2, "0")}`,
              }}
            >
              <strong className="block text-xl text-white">{value}</strong>
              <span className="mt-1 block text-[10px] text-slate-300">
                {label}
              </span>
            </div>
          ))}
          <span className="self-center text-left text-slate-500">
            Actual churn
          </span>
          {[
            ["False negative", matrix.falseNegative, REPORT_COLORS[4]],
            ["True positive", matrix.truePositive, REPORT_COLORS[0]],
          ].map(([label, value, color]) => (
            <div
              key={String(label)}
              className="rounded-lg border border-white/5 px-2 py-4"
              style={{
                backgroundColor: `${color}${Math.max(
                  20,
                  Math.round((Number(value) / matrixMax) * 170),
                )
                  .toString(16)
                  .padStart(2, "0")}`,
              }}
            >
              <strong className="block text-xl text-white">{value}</strong>
              <span className="mt-1 block text-[10px] text-slate-300">
                {label}
              </span>
            </div>
          ))}
        </div>
      </ChartCell>

      <ChartCell
        title="Precision and recall by threshold"
        subtitle="Choose the trade-off between missed churn and unnecessary outreach"
      >
        <svg
          viewBox="0 0 320 170"
          className="h-44 w-full"
          role="img"
          aria-label="Precision and recall threshold curve"
        >
          {[0, 0.5, 1].map((value) => (
            <g key={value}>
              <line
                x1="28"
                x2="302"
                y1={142 - value * 124}
                y2={142 - value * 124}
                stroke="#273244"
                strokeDasharray="3 4"
              />
              <text x="4" y={146 - value * 124} fill="#64748b" fontSize="9">
                {Math.round(value * 100)}%
              </text>
            </g>
          ))}
          {(["precision", "recall", "f1"] as const).map(
            (metric, metricIndex) => (
              <polyline
                key={metric}
                fill="none"
                stroke={REPORT_COLORS[metricIndex]}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={result.thresholdCurve
                  .map(
                    (point) =>
                      `${chartPoint(point.threshold, 0.1, 0.9, 28, 302)},${chartPoint(point[metric], 0, 1, 142, 18)}`,
                  )
                  .join(" ")}
              />
            ),
          )}
          <text x="28" y="162" fill="#64748b" fontSize="9">
            10% threshold
          </text>
          <text x="248" y="162" fill="#64748b" fontSize="9">
            90%
          </text>
        </svg>
        <ChartLegend
          items={[
            { label: "Precision", color: REPORT_COLORS[0] },
            { label: "Recall", color: REPORT_COLORS[1] },
            { label: "F1", color: REPORT_COLORS[2] },
          ]}
        />
      </ChartCell>

      <ChartCell
        title="Risk distribution"
        subtitle="Customer volume and observed churn within each model-risk band"
      >
        <div className="flex h-44 items-end gap-3 border-b border-slate-800 px-2 pb-2">
          {result.riskDistribution.map((bucket) => (
            <div
              key={bucket.label}
              className="flex h-full flex-1 flex-col justify-end text-center"
            >
              <span className="mb-1 text-[10px] text-slate-400">
                {bucket.count}
              </span>
              <div
                className="relative mx-auto w-full max-w-12 rounded-t bg-violet-500/70"
                style={{
                  height: `${Math.max(4, (bucket.count / maxRiskCount) * 105)}px`,
                }}
              >
                <span className="absolute inset-x-0 top-1 text-[9px] font-medium text-white">
                  {percent(bucket.churnRate)}
                </span>
              </div>
              <span className="mt-1.5 text-[9px] text-slate-500">
                {bucket.label}
              </span>
            </div>
          ))}
        </div>
      </ChartCell>

      <ChartCell
        title="Top churn drivers"
        subtitle="Normalised logistic-model influence; direction shows impact on risk"
      >
        <div className="space-y-2.5">
          {result.featureDrivers.map((driver) => (
            <div
              key={driver.feature}
              className="grid grid-cols-[128px_1fr_62px] items-center gap-2 text-xs"
            >
              <span className="truncate text-slate-300" title={driver.feature}>
                {driver.feature}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-slate-800">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${driver.importance * 100}%`,
                    backgroundColor:
                      driver.direction === "increases"
                        ? REPORT_COLORS[4]
                        : REPORT_COLORS[1],
                  }}
                />
              </span>
              <span
                className={
                  driver.direction === "increases"
                    ? "text-rose-300"
                    : "text-emerald-300"
                }
              >
                {driver.direction === "increases" ? "raises" : "reduces"}
              </span>
            </div>
          ))}
        </div>
      </ChartCell>

      <ChartCell
        title="Expected intervention value"
        subtitle="Illustrative 22% save rate and A$28 contact cost per customer"
      >
        <svg
          viewBox="0 0 320 170"
          className="h-44 w-full"
          role="img"
          aria-label="Expected net value by campaign size"
        >
          <defs>
            <linearGradient id="value-fill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0"
                stopColor={REPORT_COLORS[1]}
                stopOpacity="0.35"
              />
              <stop offset="1" stopColor={REPORT_COLORS[1]} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${linePath} L292 142 L28 142 Z`} fill="url(#value-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke={REPORT_COLORS[1]}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {result.interventionCurve.map((point) => (
            <circle
              key={point.customers}
              cx={chartPoint(
                point.customers,
                0,
                result.interventionCurve.at(-1)?.customers ?? 1,
                28,
                292,
              )}
              cy={chartPoint(point.netValue, 0, maxNetValue, 142, 18)}
              r="3.5"
              fill={REPORT_COLORS[1]}
            >
              <title>{`${point.customers} customers · ${currency(point.netValue)} net value`}</title>
            </circle>
          ))}
          <text x="28" y="162" fill="#64748b" fontSize="9">
            50 customers
          </text>
          <text x="244" y="162" fill="#64748b" fontSize="9">
            {result.interventionCurve.at(-1)?.customers ?? 0}
          </text>
        </svg>
        <p className="text-right text-xs font-medium text-emerald-300">
          Peak modelled value {currency(maxNetValue)}
        </p>
      </ChartCell>

      <ChartCell
        title="Priority intervention list"
        subtitle="Highest-risk customers ranked with value and recommended next action"
      >
        <div className="max-h-52 overflow-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-slate-950 text-slate-500">
              <tr>
                <th className="px-2 py-2 font-medium">Customer</th>
                <th className="px-2 py-2 font-medium">Risk</th>
                <th className="px-2 py-2 font-medium">Value</th>
                <th className="px-2 py-2 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {result.highRiskCustomers.map((customer) => (
                <tr key={customer.customerId} className="text-slate-300">
                  <td className="px-2 py-2 font-mono text-slate-200">
                    {customer.customerId}
                  </td>
                  <td className="px-2 py-2 text-rose-300">
                    {percent(customer.risk)}
                  </td>
                  <td className="px-2 py-2">
                    {currency(customer.lifetimeValue)}
                  </td>
                  <td className="max-w-48 px-2 py-2 text-slate-400">
                    {customer.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCell>
    </div>
  );
}
