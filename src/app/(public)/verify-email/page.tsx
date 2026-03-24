import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = token?.trim();
  if (!t) {
    redirect("/login?role=member&verified=invalid");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Verify your email</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6 leading-relaxed">
        Click the button below to confirm your address and sign in. You won&apos;t need to enter your password again.
      </p>
      <form method="POST" action="/api/site/verify-email" className="space-y-4">
        <input type="hidden" name="token" value={t} />
        <button
          type="submit"
          className="w-full rounded-lg py-2.5 font-semibold text-[var(--color-badge-text)]"
          style={{
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
          }}
        >
          Verify email and sign in
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        <Link href="/login?role=member" className="text-[var(--color-gold)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
