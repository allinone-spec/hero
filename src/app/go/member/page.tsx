"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function GoMemberPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site/me", { credentials: "include", cache: "no-store" })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) router.replace("/my-heroes");
        else router.replace("/login?role=member&next=" + encodeURIComponent("/my-heroes"));
      })
      .catch(() => {
        if (!cancelled) router.replace("/login?role=member&next=" + encodeURIComponent("/my-heroes"));
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
      <LoadingSpinner size="lg" className="text-[var(--color-gold)]" label="Loading Owner session" />
      <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
    </div>
  );
}
