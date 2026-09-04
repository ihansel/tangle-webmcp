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
        d="M8 10h15.5C29 10 32 12.9 32 17s-3 7-8.5 7H16.5C11 24 8 26.9 8 31"
        stroke="#7759ff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 30H16.5C11 30 8 27.1 8 23s3-7 8.5-7h7C29 16 32 13.1 32 9"
        stroke="#35c9e8"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StrandLogo({
  className,
  markClassName,
  tone = "dark",
  showByline = false,
}: {
  className?: string;
  markClassName?: string;
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
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "text-[1.4rem] font-semibold tracking-[-0.045em]",
            isLight ? "text-white" : "text-foreground",
          )}
        >
          strand
        </span>
        {showByline && (
          <span
            className={cn(
              "mt-1 text-[0.625rem] font-medium uppercase tracking-[0.14em]",
              isLight ? "text-slate-400" : "text-muted-foreground",
            )}
          >
            built on Tangle
          </span>
        )}
      </span>
    </span>
  );
}
