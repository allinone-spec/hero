"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL → unified registration (admin access request) */
export default function LegacyAdminRegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/register?role=admin");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-text-muted)]">
      Redirecting…
    </div>
  );
}
