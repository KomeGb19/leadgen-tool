import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default" | "amber" | "ok" | "warn" | "danger" | "info" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-line text-paper",
  amber: "bg-amber/15 text-amber border border-amber/30",
  ok: "bg-ok/15 text-ok border border-ok/30",
  warn: "bg-warn/15 text-warn border border-warn/30",
  danger: "bg-danger/15 text-danger border border-danger/30",
  info: "bg-info/15 text-info border border-info/30",
  outline: "bg-transparent text-muted border border-line",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
