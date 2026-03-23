"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface MyHero {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string;
  adoptionExpiry: string | null;
  published: boolean;
  score: number;
}

export default function MyHeroesPage() {
  const [heroes, setHeroes] = useState<MyHero[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const meRes = await fetch("/api/site/me");
    if (!meRes.ok) {
      setHeroes([]);
      setEmail(null);
      return;
    }
    const me = await meRes.json();
    setEmail(me.email);

    const hRes = await fetch("/api/site/my-heroes");
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
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-[var(--color-text-muted)]">
        Loading…
      </div>
    );
  }

  if (!email) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-4">My heroes</h1>
        <p className="text-[var(--color-text-muted)] mb-6">Sign in to see heroes you adopt.</p>
        <Link
          href="/login?role=member"
          className="inline-block rounded-lg px-5 py-2.5 font-semibold text-[var(--color-badge-text)]"
          style={{
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
          }}
        >
          Member sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">My heroes</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{email}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {heroes.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">
          You are not listed as the owner of any hero yet. After you adopt a hero, it will appear here.
        </p>
      ) : (
        <ul className="space-y-4">
          {heroes.map((h) => (
            <li
              key={h.id}
              className="flex gap-4 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-hover)]">
                {h.avatarUrl ? (
                  <Image src={h.avatarUrl} alt="" fill className="object-cover" sizes="64px" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[var(--color-text)] truncate">{h.name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {h.published ? "Published" : "Not published"} · {h.score} pts
                  {h.adoptionExpiry && (
                    <> · Adoption until {new Date(h.adoptionExpiry).toLocaleDateString()}</>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {h.published && (
                  <Link
                    href={`/heroes/${h.slug}`}
                    className="text-sm text-[var(--color-gold)] hover:underline text-right"
                  >
                    View
                  </Link>
                )}
                <Link
                  href={`/heroes/${h.slug}/edit`}
                  className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-gold)] text-right"
                >
                  Edit profile
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
