import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

export function StrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      <path
        d="M30.5 8.5h-15C11.4 8.5 8 11.2 8 14.7s3.4 6.3 7.5 6.3h9c4.1 0 7.5 2.8 7.5 6.3s-3.4 6.2-7.5 6.2h-15"
        stroke="#8064ff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30.5" cy="8.5" r="2.4" fill="#36c8e8" />
      <circle cx="9.5" cy="33.5" r="2.4" fill="#36c8e8" />
    </svg>
  );
}

export function StrandLogo({
  className,
  markClassName,
  wordmarkClassName,
  tone = "dark",
  showByline = false,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  tone?: "dark" | "light";
  showByline?: boolean;
}) {
  const isLight = tone === "light";

  return (
    <span
      role="img"
      aria-label="Strand"
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <StrandMark className={cn("size-8", markClassName)} />
      <span
        className={cn("flex min-w-0 flex-col leading-none", wordmarkClassName)}
      >
        <span
          className={cn(
            "text-[1.35rem] font-semibold tracking-[-0.035em]",
            isLight ? "text-white" : "text-foreground",
          )}
        >
          strand
        </span>
        {showByline && (
          <span
            className={cn(
              "mt-1 text-[0.6875rem] font-medium tracking-normal",
              isLight ? "text-slate-400" : "text-muted-foreground",
            )}
          >
            Built on Tangle
          </span>
        )}
      </span>
    </span>
  );
}
