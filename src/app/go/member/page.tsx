"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLoader } from "@/components/ui/AdminLoader";

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

  return <AdminLoader fullscreen label="Loading owner session…" />;
}
