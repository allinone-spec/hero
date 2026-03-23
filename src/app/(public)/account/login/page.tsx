"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL → unified sign-in */
export default function LegacyAccountLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("role")) params.set("role", "member");
    router.replace("/login?" + params.toString());
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center text-[var(--color-text-muted)] text-sm">
      Redirecting to sign in…
    </div>
  );
}
