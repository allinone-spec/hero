import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="text-6xl text-[var(--color-gold)]">★</span>
        <h1 className="text-2xl font-bold mt-4">Page Not Found</h1>
        <p className="text-[var(--color-text-muted)] mt-2 mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" className="btn-primary">
          Back to Rankings
        </Link>
      </div>
    </div>
  );
}
