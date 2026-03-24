"use client";

type SpinnerSize = "xs" | "sm" | "md" | "lg";

const sizeClass: Record<SpinnerSize, string> = {
  xs: "w-3 h-3 border-2",
  sm: "w-3.5 h-3.5 border-2",
  md: "w-4 h-4 border-2",
  lg: "w-8 h-8 border-[3px]",
};

type LoadingSpinnerProps = {
  size?: SpinnerSize;
  className?: string;
  /** For accessibility when the spinner is the main loading indicator */
  label?: string;
};

export default function LoadingSpinner({ size = "sm", className = "", label }: LoadingSpinnerProps) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border-current border-t-transparent animate-spin ${sizeClass[size]} ${className}`}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
