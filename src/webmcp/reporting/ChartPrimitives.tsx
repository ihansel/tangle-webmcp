import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const REPORT_COLORS = [
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#38bdf8",
  "#f43f5e",
  "#84cc16",
];

export function ChartCell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-slate-800 bg-[#111116] p-4",
        className,
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-400">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export const currency = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);

export const chartPoint = (
  value: number,
  min: number,
  max: number,
  start: number,
  end: number,
) =>
  start + ((value - min) / Math.max(Number.EPSILON, max - min)) * (end - start);
