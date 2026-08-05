import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded border border-line bg-ink px-3 text-sm text-paper placeholder:text-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
