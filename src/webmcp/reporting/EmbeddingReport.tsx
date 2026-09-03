import { useMemo, useState } from "react";

import type { EmbeddingRunResult } from "../types";
import {
  ChartCell,
  ChartLegend,
  chartPoint,
  percent,
  REPORT_COLORS,
} from "./ChartPrimitives";

export function EmbeddingReport({ result }: { result: EmbeddingRunResult }) {
  const [selectedSku, setSelectedSku] = useState(result.products[0]?.sku ?? "");
  const selected =
    result.products.find((product) => product.sku === selectedSku) ??
    result.products[0];
  const categories = useMemo(
    () => [...new Set(result.points.map((point) => point.category))],
    [result.points],
  );
  const colorForCategory = (category: string) =>
    REPORT_COLORS[
      Math.max(0, categories.indexOf(category)) % REPORT_COLORS.length
    ];
  const networkNodes = useMemo(
    () =>
      [
        ...new Set(
          result.coPurchaseLinks.flatMap((link) => [link.source, link.target]),
        ),
      ].slice(0, 18),
    [result.coPurchaseLinks],
  );
  const positions = useMemo(
    () =>
      new Map(
        networkNodes.map((sku, index) => {
          const angle =
            (index / Math.max(1, networkNodes.length)) * Math.PI * 2;
          return [
            sku,
            {
              x: 170 + Math.cos(angle) * 118,
              y: 130 + Math.sin(angle) * 92,
            },
          ] as const;
        }),
      ),
    [networkNodes],
  );
  const maxCohesion = Math.max(
    0.01,
    ...result.categoryCohesion.map((category) => category.score),
  );
  const lossValues =
    result.training?.lossCurve.map((point) => point.loss) ?? [];
  const lossMin = Math.min(...lossValues, 0);
  const lossMax = Math.max(...lossValues, 1);
  const lossPath = result.training?.lossCurve
    .map((point, index, curve) => {
      const x = chartPoint(index, 0, Math.max(1, curve.length - 1), 28, 420);
      const y = chartPoint(point.loss, lossMin, lossMax, 150, 18);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {result.training ? (
        <ChartCell
          title="Product2Vec training"
          subtitle={`${result.training.epochs} epochs of skip-gram training with negative sampling, fitted entirely in this browser`}
          className="lg:col-span-2"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
            <svg
              viewBox="0 0 440 170"
              className="h-44 w-full"
              role="img"
              aria-label="Product2Vec training loss by epoch"
            >
              <line x1="28" x2="420" y1="150" y2="150" stroke="#334155" />
              <line x1="28" x2="28" y1="18" y2="150" stroke="#334155" />
              <path
                d={lossPath}
                fill="none"
                stroke="#38bdf8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              {result.training.lossCurve.map((point, index, curve) => (
                <circle
                  key={point.epoch}
                  cx={chartPoint(
                    index,
                    0,
                    Math.max(1, curve.length - 1),
                    28,
                    420,
                  )}
                  cy={chartPoint(point.loss, lossMin, lossMax, 150, 18)}
                  r="3"
                  fill="#e0f2fe"
                >
                  <title>{`Epoch ${point.epoch}: loss ${point.loss.toFixed(3)}`}</title>
                </circle>
              ))}
              <text x="28" y="166" fill="#64748b" fontSize="9">
                epoch 1
              </text>
              <text x="382" y="166" fill="#64748b" fontSize="9">
                epoch {result.training.epochs}
              </text>
            </svg>
            <dl className="grid grid-cols-2 gap-3 self-center">
              {[
                ["Training pairs", result.training.pairCount.toLocaleString()],
                ["Dimensions", `${result.dimensions}D`],
                ["Initial loss", result.training.initialLoss.toFixed(3)],
                ["Final loss", result.training.finalLoss.toFixed(3)],
                [
                  "Context similarity",
                  percent(result.training.contextSimilarity),
                ],
                [
                  "Random baseline",
                  percent(result.training.baselineSimilarity),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5"
                >
                  <dt className="text-[10px] uppercase tracking-wide text-slate-600">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-100">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </ChartCell>
      ) : null}

      <ChartCell
        title="Product embedding map"
        subtitle={`${result.rowCount} products projected with PCA from ${result.dimensions}-dimensional ${result.algorithm === "product2vec" ? "learned" : "local text"} vectors`}
      >
        <svg
          viewBox="0 0 440 250"
          className="h-64 w-full"
          role="img"
          aria-label="Product embedding map"
        >
          <line x1="28" x2="426" y1="224" y2="224" stroke="#334155" />
          <line x1="28" x2="28" y1="18" y2="224" stroke="#334155" />
          {result.points.map((point) => (
            <circle
              key={point.sku}
              cx={chartPoint(point.x, -1, 1, 34, 420)}
              cy={chartPoint(point.y, -1, 1, 218, 22)}
              r="4"
              fill={colorForCategory(point.category)}
              fillOpacity="0.76"
            >
              <title>{`${point.sku} · ${point.name} · ${point.category}`}</title>
            </circle>
          ))}
        </svg>
        <ChartLegend
          items={categories.slice(0, 8).map((category) => ({
            label: category,
            color: colorForCategory(category),
          }))}
        />
      </ChartCell>

      <ChartCell
        title="Nearest-neighbour explorer"
        subtitle={`Select any SKU to inspect its closest ${result.algorithm === "product2vec" ? "co-purchase" : "semantic"} alternatives`}
      >
        <label
          className="mb-4 block text-[11px] font-medium text-slate-500"
          htmlFor="sku-neighbour-select"
        >
          Product
        </label>
        <select
          id="sku-neighbour-select"
          value={selectedSku}
          onChange={(event) => setSelectedSku(event.target.value)}
          className="mb-4 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-violet-500"
        >
          {result.products.map((product) => (
            <option key={product.sku} value={product.sku}>
              {product.sku} · {product.name}
            </option>
          ))}
        </select>
        {selected ? (
          <div className="space-y-2">
            <div className="mb-3 flex items-end justify-between border-b border-slate-800 pb-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {selected.name}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {selected.category} · {selected.sku}
                </p>
              </div>
              <span className="text-[10px] text-slate-500">
                Top {selected.neighbors.length}
              </span>
            </div>
            {selected.neighbors.map((neighbor, index) => (
              <div
                key={neighbor.sku}
                className="grid grid-cols-[20px_1fr_46px] items-center gap-2 rounded-lg border border-slate-800 px-3 py-2.5"
              >
                <span className="font-mono text-[10px] text-slate-600">
                  0{index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">
                    {neighbor.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                    {neighbor.sku}
                  </p>
                </div>
                <span className="text-right text-xs font-medium text-sky-300">
                  {percent(neighbor.similarity)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </ChartCell>

      <ChartCell
        title="Product similarity heatmap"
        subtitle="Pairwise cosine similarity across representative category products"
      >
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[410px] gap-1"
            style={{
              gridTemplateColumns: `64px repeat(${result.similarityMatrix.labels.length}, 1fr)`,
            }}
          >
            <span />
            {result.similarityMatrix.labels.map((label) => (
              <span
                key={label}
                className="pb-1 text-center font-mono text-[9px] text-slate-500"
              >
                {label.replace("SKU-", "")}
              </span>
            ))}
            {result.similarityMatrix.values.map((row, rowIndex) => (
              <div
                key={result.similarityMatrix.labels[rowIndex]}
                className="contents"
              >
                <span className="flex items-center font-mono text-[9px] text-slate-500">
                  {result.similarityMatrix.labels[rowIndex]}
                </span>
                {row.map((value, columnIndex) => (
                  <span
                    key={`${rowIndex}-${columnIndex}`}
                    className="rounded px-1 py-3 text-center text-[9px] text-white"
                    style={{
                      backgroundColor: `rgba(56,189,248,${0.08 + value * 0.82})`,
                    }}
                  >
                    {Math.round(value * 100)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </ChartCell>

      <ChartCell
        title="Category cohesion"
        subtitle="Average within-category similarity; higher means a more consistent assortment"
      >
        <div className="space-y-3">
          {result.categoryCohesion.map((category) => (
            <div
              key={category.category}
              className="grid grid-cols-[96px_1fr_74px] items-center gap-3 text-xs"
            >
              <span className="truncate capitalize text-slate-300">
                {category.category}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-slate-800">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(category.score / maxCohesion) * 100}%`,
                    backgroundColor: colorForCategory(category.category),
                  }}
                />
              </span>
              <span className="text-right text-slate-500">
                {percent(category.score)} · {category.productCount}
              </span>
            </div>
          ))}
        </div>
      </ChartCell>

      <ChartCell
        title="Co-purchase network"
        subtitle="Frequently paired products reveal cross-sell paths beyond category similarity"
      >
        <svg
          viewBox="0 0 340 270"
          className="h-72 w-full"
          role="img"
          aria-label="Product co-purchase network"
        >
          {result.coPurchaseLinks
            .filter(
              (link) =>
                positions.has(link.source) && positions.has(link.target),
            )
            .map((link) => {
              const source = positions.get(link.source)!;
              const target = positions.get(link.target)!;
              return (
                <line
                  key={`${link.source}-${link.target}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#475569"
                  strokeOpacity={0.35 + link.strength * 0.45}
                  strokeWidth={0.7 + link.strength * 2}
                >
                  <title>{`${link.source} + ${link.target}`}</title>
                </line>
              );
            })}
          {networkNodes.map((sku) => {
            const point = positions.get(sku)!;
            const product = result.products.find((item) => item.sku === sku);
            return (
              <g key={sku}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="10"
                  fill={colorForCategory(product?.category ?? "")}
                  fillOpacity="0.9"
                >
                  <title>{`${sku} · ${product?.name ?? "Product"}`}</title>
                </circle>
                <text
                  x={point.x}
                  y={point.y + 3}
                  fill="#020617"
                  fontSize="6.5"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {sku.slice(-2)}
                </text>
              </g>
            );
          })}
        </svg>
      </ChartCell>

      <ChartCell
        title="Unexpected similarity opportunities"
        subtitle="Strong cross-category matches worth testing as merchandising bundles"
      >
        <div className="space-y-2.5">
          {result.unexpectedPairs.map((pair) => (
            <div
              key={`${pair.source}-${pair.target}`}
              className="rounded-lg border border-slate-800 p-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200">
                    {pair.sourceName}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    pairs with {pair.targetName}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-violet-300">
                  {percent(pair.similarity)}
                </span>
              </div>
              <p className="mt-2 font-mono text-[9px] text-slate-600">
                {pair.source} ↔ {pair.target}
              </p>
            </div>
          ))}
        </div>
      </ChartCell>
    </div>
  );
}
