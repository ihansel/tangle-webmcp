import type { ForecastingRunResult } from "../types";
import {
  ChartCell,
  ChartLegend,
  chartPoint,
  percent,
  REPORT_COLORS,
} from "./ChartPrimitives";

const friendlyName = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

export function ForecastingReport({
  result,
}: {
  result: ForecastingRunResult;
}) {
  const allValues = result.points.flatMap((point) =>
    [point.actual, point.univariate, point.multivariate].filter(
      (value): value is number => value !== null,
    ),
  );
  const minValue = Math.min(...allValues) * 0.92;
  const maxValue = Math.max(...allValues) * 1.05;
  const modelColors = {
    actual: REPORT_COLORS[1],
    univariate: REPORT_COLORS[2],
    multivariate: REPORT_COLORS[0],
  };
  const pathFor = (key: "actual" | "univariate" | "multivariate") =>
    result.points
      .map((point, index) => {
        const value = point[key];
        if (value === null) return "";
        const x = chartPoint(index, 0, result.points.length - 1, 40, 420);
        const y = chartPoint(value, minValue, maxValue, 220, 18);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  const largestError = Math.max(
    1,
    ...result.models.flatMap((model) => [
      model.metrics.mae,
      model.metrics.rmse,
    ]),
  );
  const multivariate = result.models.find(
    (model) => model.algorithm === "multivariate",
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCell
        title="28-day demand forecast"
        subtitle="Predictions are tested against the final 28 days, which the models did not see during training"
        className="lg:col-span-2"
      >
        <svg
          viewBox="0 0 450 250"
          className="h-72 w-full"
          role="img"
          aria-label="Actual units sold compared with univariate and multivariate forecasts"
        >
          {[0, 0.5, 1].map((position) => {
            const value = minValue + (maxValue - minValue) * position;
            const y = chartPoint(value, minValue, maxValue, 220, 18);
            return (
              <g key={position}>
                <line
                  x1="40"
                  x2="420"
                  y1={y}
                  y2={y}
                  stroke="#273244"
                  strokeDasharray="3 4"
                />
                <text x="4" y={y + 4} fill="#64748b" fontSize="10">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}
          {(["actual", "univariate", "multivariate"] as const).map((key) => (
            <path
              key={key}
              d={pathFor(key)}
              fill="none"
              stroke={modelColors[key]}
              strokeWidth={key === "actual" ? 3 : 2.5}
              strokeDasharray={key === "actual" ? undefined : "5 4"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          <text x="40" y="243" fill="#64748b" fontSize="10">
            {result.points[0]?.date}
          </text>
          <text x="348" y="243" fill="#64748b" fontSize="10">
            {result.points.at(-1)?.date}
          </text>
        </svg>
        <ChartLegend
          items={[
            { label: "Actual demand", color: modelColors.actual },
            { label: "Sales history only", color: modelColors.univariate },
            { label: "With retail drivers", color: modelColors.multivariate },
          ]}
        />
      </ChartCell>

      <ChartCell
        title="Forecast accuracy"
        subtitle="Lower error is better; MAE is the average number of units missed each day"
      >
        <div className="space-y-5 pt-1">
          {result.models.map((model) => (
            <div key={model.taskId}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">
                  {model.algorithm === "univariate"
                    ? "Sales history only"
                    : "With retail drivers"}
                </span>
                <span className="text-slate-400">
                  {model.metrics.mae.toFixed(1)} units MAE
                </span>
              </div>
              <div className="grid grid-cols-[52px_1fr_46px] items-center gap-2 text-xs text-slate-500">
                <span>MAE</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(model.metrics.mae / largestError) * 100}%`,
                      backgroundColor:
                        model.algorithm === "multivariate"
                          ? modelColors.multivariate
                          : modelColors.univariate,
                    }}
                  />
                </span>
                <span>{model.metrics.mae.toFixed(1)}</span>
                <span>RMSE</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <span
                    className="block h-full rounded-full opacity-60"
                    style={{
                      width: `${(model.metrics.rmse / largestError) * 100}%`,
                      backgroundColor:
                        model.algorithm === "multivariate"
                          ? modelColors.multivariate
                          : modelColors.univariate,
                    }}
                  />
                </span>
                <span>{model.metrics.rmse.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {result.insight}
        </div>
      </ChartCell>

      <ChartCell
        title="What the richer forecast knows"
        subtitle="These values are known for each forecast day and can explain sudden demand changes"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(multivariate?.driverNames ?? []).map((driver, index) => (
            <div
              key={driver}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"
            >
              <span
                className="mb-3 block size-2.5 rounded-full"
                style={{
                  backgroundColor: REPORT_COLORS[index % REPORT_COLORS.length],
                }}
              />
              <p className="text-sm font-medium text-slate-200">
                {friendlyName(driver)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          The history-only version uses past {friendlyName(result.targetColumn)}
          . The richer version adds planned or observable retail conditions for
          each day.
        </p>
      </ChartCell>

      <ChartCell
        title="Daily forecast detail"
        subtitle="A readable audit trail for every day in the holdout period"
        className="lg:col-span-2"
      >
        <div className="max-h-72 overflow-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-950 text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Actual units</th>
                <th className="px-3 py-2.5 font-medium">History forecast</th>
                <th className="px-3 py-2.5 font-medium">
                  Retail-driver forecast
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {result.points.map((point) => (
                <tr key={point.date} className="text-slate-300">
                  <td className="px-3 py-2.5 font-mono text-slate-400">
                    {point.date}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-emerald-300">
                    {point.actual.toFixed(0)}
                  </td>
                  <td className="px-3 py-2.5">
                    {point.univariate?.toFixed(1) ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {point.multivariate?.toFixed(1) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCell>

      <ChartCell
        title="Run summary"
        subtitle="A bounded, reproducible browser forecast"
        className="lg:col-span-2"
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            [result.trainingRowCount.toLocaleString(), "training days"],
            [result.horizon.toString(), "forecast days"],
            [result.preferredModelName, "preferred approach"],
            [
              result.improvement > 0 ? percent(result.improvement) : "—",
              "MAE improvement",
            ],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg bg-slate-950 p-3">
              <p
                className="truncate text-base font-semibold text-white"
                title={value}
              >
                {value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </ChartCell>
    </div>
  );
}
