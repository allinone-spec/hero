"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function GoAdminPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) router.replace("/admin");
        else router.replace("/login?role=admin&next=" + encodeURIComponent("/admin"));
      })
      .catch(() => {
        if (!cancelled) router.replace("/login?role=admin&next=" + encodeURIComponent("/admin"));
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <LoadingSpinner size="lg" className="text-[var(--color-gold)]" label="Loading Admin session" />
      <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
    </div>
  );
}
