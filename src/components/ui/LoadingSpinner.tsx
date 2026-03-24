"use client";

import { AdminLoaderOrbit } from "@/components/ui/AdminLoader";

type SpinnerSize = "xs" | "sm" | "md" | "lg";

const pixel: Record<SpinnerSize, number> = {
  xs: 14,
  sm: 18,
  md: 26,
  lg: 44,
};

type LoadingSpinnerProps = {
  size?: SpinnerSize;
  className?: string;
  /** For accessibility when the spinner is the main loading indicator */
  label?: string;
};

/** Same orbit animation as {@link AdminLoader}, scaled for inline / button use. */
export default function LoadingSpinner({
  size = "sm",
  className = "",
  label,
}: LoadingSpinnerProps) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 text-[var(--color-gold)] ${className}`}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <AdminLoaderOrbit size={pixel[size]} variant="inherit" />
    </span>
  );
}
