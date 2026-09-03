import type { ClusteringRunResult } from "../types";
import {
  ChartCell,
  ChartLegend,
  chartPoint,
  currency,
  percent,
  REPORT_COLORS,
} from "./ChartPrimitives";

const shortFeature = (feature: string) =>
  feature
    .replace("days_since_order", "recency")
    .replace("discount_share", "discounts")
    .replace("email_engagement", "engagement")
    .replace("avg_basket", "basket")
    .replace("return_rate", "returns");

export function ClusteringReport({ result }: { result: ClusteringRunResult }) {
  const colorFor = (cluster: number) =>
    REPORT_COLORS[cluster % REPORT_COLORS.length];
  const profileByCluster = new Map(
    result.clusters.map((cluster) => [cluster.cluster, cluster]),
  );
  const maxSize = Math.max(
    1,
    ...result.clusters.map((cluster) => cluster.size),
  );
  const heatLimit = Math.max(
    1,
    ...result.centroids.flatMap((centroid) =>
      centroid.values.map((value) => Math.abs(value)),
    ),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCell
        title="Customer map"
        subtitle="A two-axis projection of value and engagement; hover any customer"
      >
        <svg
          viewBox="0 0 440 250"
          className="h-64 w-full"
          role="img"
          aria-label="Customer segment map"
        >
          <line x1="32" x2="424" y1="220" y2="220" stroke="#334155" />
          <line x1="32" x2="32" y1="16" y2="220" stroke="#334155" />
          <text x="338" y="242" fill="#64748b" fontSize="10">
            customer value →
          </text>
          <text x="8" y="14" fill="#64748b" fontSize="10">
            engagement ↑
          </text>
          {result.points.map((point) => (
            <circle
              key={point.customerId}
              cx={chartPoint(point.x, -1, 1, 36, 420)}
              cy={chartPoint(point.y, -1, 1, 216, 20)}
              r="3.2"
              fill={colorFor(point.cluster)}
              fillOpacity="0.72"
            >
              <title>{`${point.customerId} · ${profileByCluster.get(point.cluster)?.label ?? `Segment ${point.cluster + 1}`}`}</title>
            </circle>
          ))}
        </svg>
        <ChartLegend
          items={result.clusters.map((cluster) => ({
            label: cluster.label,
            color: colorFor(cluster.cluster),
          }))}
        />
      </ChartCell>

      <ChartCell
        title="Segment size"
        subtitle={`${result.rowCount.toLocaleString()} customers distributed across ${result.clusterCount} discovered cohorts`}
      >
        <div className="space-y-4 pt-2">
          {result.clusters.map((cluster) => (
            <div key={cluster.cluster}>
              <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                <span className="font-medium text-slate-200">
                  {cluster.label}
                </span>
                <span className="text-slate-500">
                  {cluster.size} · {percent(cluster.share)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(cluster.size / maxSize) * 100}%`,
                    backgroundColor: colorFor(cluster.cluster),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartCell>

      <ChartCell
        title="Feature-centroid heatmap"
        subtitle="Standard deviations above or below the overall customer average"
        className="lg:col-span-2"
      >
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[760px] gap-1 text-[10px]"
            style={{
              gridTemplateColumns: `150px repeat(${result.featureNames.length}, minmax(72px, 1fr))`,
            }}
          >
            <span />
            {result.featureNames.map((feature) => (
              <span
                key={feature}
                className="px-1 pb-1 text-center text-slate-500"
              >
                {shortFeature(feature)}
              </span>
            ))}
            {result.centroids.map((centroid) => (
              <div key={centroid.cluster} className="contents">
                <span className="flex items-center font-medium text-slate-300">
                  {profileByCluster.get(centroid.cluster)?.label ??
                    `Segment ${centroid.cluster + 1}`}
                </span>
                {centroid.values.map((value, index) => {
                  const intensity = Math.min(
                    0.84,
                    0.12 + Math.abs(value / heatLimit) * 0.72,
                  );
                  return (
                    <span
                      key={`${centroid.cluster}-${result.featureNames[index]}`}
                      className="rounded-md border border-white/5 px-1 py-3 text-center font-mono text-white"
                      style={{
                        backgroundColor:
                          value >= 0
                            ? `rgba(16,185,129,${intensity})`
                            : `rgba(244,63,94,${intensity})`,
                      }}
                    >
                      {value > 0 ? "+" : ""}
                      {value.toFixed(1)}σ
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </ChartCell>

      <ChartCell
        title="Segment comparison"
        subtitle="Operational profile of every discovered customer cohort"
        className="lg:col-span-2"
      >
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-950 text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-medium">Segment</th>
                <th className="px-3 py-2.5 font-medium">Customers</th>
                <th className="px-3 py-2.5 font-medium">Revenue share</th>
                <th className="px-3 py-2.5 font-medium">Profile</th>
                <th className="px-3 py-2.5 font-medium">Recommended action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {result.clusters.map((cluster) => (
                <tr key={cluster.cluster}>
                  <td className="px-3 py-3 font-medium text-slate-200">
                    <span
                      className="mr-2 inline-block size-2 rounded-full"
                      style={{ backgroundColor: colorFor(cluster.cluster) }}
                    />
                    {cluster.label}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {cluster.size} ({percent(cluster.share)})
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {percent(cluster.revenueShare)}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {cluster.summary}
                  </td>
                  <td className="max-w-56 px-3 py-3 text-slate-300">
                    {cluster.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCell>

      <ChartCell
        title="Revenue contribution"
        subtitle="Compare each segment's customer share with its share of total revenue"
      >
        <div className="space-y-4">
          {result.clusters.map((cluster) => (
            <div key={cluster.cluster} className="space-y-1.5">
              <p className="truncate text-xs font-medium text-slate-300">
                {cluster.label}
              </p>
              <div className="grid grid-cols-[72px_1fr_38px] items-center gap-2 text-[10px] text-slate-500">
                <span>Customers</span>
                <span className="h-2 rounded-full bg-slate-800">
                  <span
                    className="block h-full rounded-full bg-slate-500"
                    style={{ width: `${cluster.share * 100}%` }}
                  />
                </span>
                <span>{percent(cluster.share)}</span>
                <span>Revenue</span>
                <span className="h-2 rounded-full bg-slate-800">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${cluster.revenueShare * 100}%`,
                      backgroundColor: colorFor(cluster.cluster),
                    }}
                  />
                </span>
                <span>{percent(cluster.revenueShare)}</span>
              </div>
            </div>
          ))}
        </div>
      </ChartCell>

      <ChartCell
        title="Representative customers and actions"
        subtitle="Customers nearest each centroid make every segment tangible"
      >
        <div className="space-y-3">
          {result.clusters.map((cluster) => (
            <div
              key={cluster.cluster}
              className="rounded-lg border border-slate-800 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-200">
                  {cluster.label}
                </span>
                <span className="text-[10px] text-slate-500">
                  {cluster.action}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {cluster.examples.map((customer) => (
                  <span
                    key={customer.customerId}
                    className="rounded-md bg-slate-900 px-2 py-1.5 text-[10px] text-slate-400"
                    title={`${customer.orders} orders · ${customer.daysSinceOrder} days since order`}
                  >
                    <strong className="font-mono text-slate-200">
                      {customer.customerId}
                    </strong>{" "}
                    · {currency(customer.lifetimeValue)} LTV
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ChartCell>
    </div>
  );
}
