"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLoader } from "@/components/ui/AdminLoader";

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

  return <AdminLoader fullscreen label="Loading admin session…" />;
}
