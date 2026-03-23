"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL → unified registration */
export default function LegacyAccountRegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("role")) params.set("role", "member");
    router.replace("/register?" + params.toString());
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center text-[var(--color-text-muted)] text-sm">
      Redirecting…
    </div>
  );
}
