import Link from "next/link";

const NAV_LINKS = [
  { href: "/",            label: "Home" },
  { href: "/rankings",    label: "Rankings" },
  { href: "/medals",      label: "Medal Catalog" },
  { href: "/scoring",      label: "USM-25 Scoring" },
];

const RESOURCE_LINKS = [
  { href: "/scoring",  label: "Scoring Rules" }
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl text-[var(--color-gold)]">★</span>
              <span className="text-lg font-bold">Medals <span style={{ color: "#3b82f6" }}>N</span> Bongs</span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-xs">
              A comprehensive archive of decorated U.S. military heroes, objectively ranked
              by the Unified Scoring Matrix (USM-25). Honoring valor through history.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                  color: "#1a1a2e",
                }}
              >
                USM-25 v1.0
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">Scoring Standard</span>
            </div>
          </div>

          {/* Navigation */}
          {/* <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}

          {/* Admin / Resources */}
          {/* <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] mb-4">
              Admin
            </h4>
            <ul className="space-y-2.5">
              {RESOURCE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors inline-block"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--color-border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            © {year} Medals <span style={{ color: "#3b82f6" }}>N</span> Bongs. All historical records are for educational purposes.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Scored under the{" "}
            <Link href="/scoring" className="text-[var(--color-gold)] hover:underline">
              Unified Scoring Matrix (USM-25)
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
