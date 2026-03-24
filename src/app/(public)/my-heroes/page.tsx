"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AvatarFallback from "@/components/ui/AvatarFallback";

interface MyHero {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string;
  adoptionExpiry: string | null;
  published: boolean;
  score: number;
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-[var(--color-text)] sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{sub}</p>}
      </div>
      <div className="hidden h-px flex-1 bg-[var(--color-border)] sm:block sm:mb-3" />
    </div>
  );
}

export default function MyHeroesPage() {
  const [heroes, setHeroes] = useState<MyHero[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const meRes = await fetch("/api/site/me", { credentials: "include", cache: "no-store" });
    if (!meRes.ok) {
      setHeroes([]);
      setEmail(null);
      return;
    }
    const me = await meRes.json();
    setEmail(me.email);

    const hRes = await fetch("/api/site/my-heroes", { credentials: "include", cache: "no-store" });
    if (!hRes.ok) {
      setError("Could not load your heroes.");
      setHeroes([]);
      return;
    }
    const data = await hRes.json();
    setHeroes(Array.isArray(data.heroes) ? data.heroes : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (heroes === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-48 rounded-lg bg-[var(--color-border)]/50" />
          <div className="h-4 w-72 rounded bg-[var(--color-border)]/40" />
          <div className="h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50" />
          <div className="h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <SectionHeader
          title="My Heroes"
          sub="Sign in with your Owner account to see heroes you support through adoption."
        />
        <Link
          href="/login?role=member"
          className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-[var(--color-badge-text)] transition-opacity hover:opacity-95"
          style={{
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
          }}
        >
          Owner sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <SectionHeader
        title="My Heroes"
        sub="Heroes you’ve adopted appear here — same archive quality as the main rankings, with quick access to public profiles and tribute editing."
      />
      <p className="-mt-4 mb-8 text-xs text-[var(--color-text-muted)]">
        Signed in as <span className="font-medium text-[var(--color-text)]">{email}</span>
        {" · "}
        <Link href="/rankings" className="text-[var(--color-gold)] hover:underline">
          Browse all heroes
        </Link>
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {heroes.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-8 text-center">
          <p className="text-[var(--color-text-muted)] mb-5 max-w-md mx-auto leading-relaxed">
            You don’t have any adopted heroes yet. When you complete an adoption, the profile will show up here so you
            can open it or edit the tribute.
          </p>
          <Link
            href="/rankings"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]"
          >
            Explore rankings
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {heroes.map((h, index) => (
            <li key={h.id}>
              <div className="hero-card group flex flex-col gap-4 p-4 transition-colors hover:border-[var(--color-gold)]/40 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="rank-number shrink-0">#{index + 1}</div>
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                    {h.avatarUrl ? (
                      <Image src={h.avatarUrl} alt="" fill className="object-cover" sizes="56px" unoptimized />
                    ) : (
                      <AvatarFallback name={h.name} size={56} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-lg text-[var(--color-text)] truncate group-hover:text-[var(--color-gold)] transition-colors">
                      {h.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
                      <span
                        className={
                          h.published
                            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-400"
                            : "rounded-full bg-[var(--color-border)]/80 px-2 py-0.5"
                        }
                      >
                        {h.published ? "Published" : "Not published"}
                      </span>
                      {h.adoptionExpiry && (
                        <>
                          <span>·</span>
                          <span>Active until {new Date(h.adoptionExpiry).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="score-badge shrink-0 self-start sm:self-center">{h.score} pts</div>
                <div className="flex flex-wrap gap-2 sm:shrink-0 sm:flex-col sm:items-stretch">
                  {h.published && (
                    <Link
                      href={`/heroes/${h.slug}?from=my-heroes`}
                      className="btn-secondary text-center text-sm py-2 px-3 sm:min-w-[7.5rem]"
                    >
                      View profile
                    </Link>
                  )}
                  <Link
                    href={`/heroes/${h.slug}/edit`}
                    className="rounded-lg border border-[var(--color-gold)]/50 bg-[var(--color-gold)]/10 px-3 py-2 text-center text-sm font-medium text-[var(--color-gold)] transition-colors hover:bg-[var(--color-gold)]/20"
                  >
                    Edit tribute
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
