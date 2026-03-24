import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function GoSegmentLoading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <LoadingSpinner size="lg" className="text-[var(--color-gold)]" label="Loading" />
      <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
    </div>
  );
}
