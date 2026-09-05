"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface GradientButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: "default" | "variant";
  children?: React.ReactNode;
}

export function gradientButtonVariants({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "variant";
  className?: string;
} = {}) {
  const base =
    "gradient-button rim-light inline-flex items-center justify-center rounded-[11px] min-w-[132px] px-6 py-3.5 text-sm leading-[19px] font-sans font-bold text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";
  const variantClass = variant === "variant" ? "gradient-button-variant" : "";
  return cn(base, variantClass, className);
}

export const GradientButton = React.forwardRef<
  HTMLAnchorElement,
  GradientButtonProps
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <a
      className={gradientButtonVariants({ variant, className })}
      ref={ref}
      {...props}
    />
  );
});

GradientButton.displayName = "GradientButton";
