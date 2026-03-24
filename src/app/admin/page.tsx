"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AvatarFallback from "@/components/ui/AvatarFallback";
import { AdminLoader } from "@/components/ui/AdminLoader";

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  sub,
  href,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
  delay?: number;
}) {
  const inner = (
    <div
      className="hero-card p-5 animate-fade-in-up h-full flex flex-col"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {href && (
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className="text-[var(--color-text-muted)] mt-0.5"
          >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <div className="text-3xl font-bold text-[var(--color-gold)] mb-0.5 leading-none">
          {value}
        </div>
        <div className="text-sm font-medium">{label}</div>
      </div>
      {/* Always reserve sub-text space so all cards stay the same height */}
      <div className="text-xs text-[var(--color-text-muted)] mt-2 min-h-[16px]">
        {sub ?? ""}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

/* ── Quick action card ───────────────────────────────────── */
function ActionCard({
  icon,
  title,
  desc,
  href,
  primary,
  delay = 0,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  primary?: boolean;
  delay?: number;
}) {
  return (
    <Link
      href={href}
      className={`hero-card p-5 block group animate-fade-in-up ${
        primary ? "border-[var(--color-gold)]/40" : ""
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <h3 className="font-semibold group-hover:text-[var(--color-gold)] transition-colors">
            {title}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
            {desc}
          </p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 mt-1 text-[var(--color-text-muted)] group-hover:text-[var(--color-gold)] group-hover:translate-x-0.5 transition-all"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}

/* ── Admin dashboard ─────────────────────────────────────── */
function AdminDashboard() {
  const [stats, setStats] = useState({
    totalHeroes: 0, published: 0, drafts: 0,
    medalTypes: 0, adminUsers: 0,
  });
  const [recentHeroes, setRecentHeroes] = useState<
    { _id: string; name: string; rank: string; branch: string; score: number; published: boolean; avatarUrl?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safeFetch = (url: string) =>
      fetch(url).then((r) => (r.ok ? r.json() : []));
    Promise.all([
      safeFetch("/api/heroes?published=false"),
      safeFetch("/api/medal-types"),
      safeFetch("/api/admin-users"),
    ]).then(([heroes, medals, users]) => {
      const h = Array.isArray(heroes) ? heroes : [];
      const pub = h.filter((x: { published: boolean }) => x.published).length;
      setStats({
        totalHeroes:  h.length,
        published:    pub,
        drafts:       h.length - pub,
        medalTypes:   Array.isArray(medals) ? medals.length : 0,
        adminUsers:   Array.isArray(users)  ? users.length  : 0,
      });
      // Most recently updated / created (last 5)
      setRecentHeroes(
        [...h]
          .sort((a: { _id: string }, b: { _id: string }) =>
            b._id.toString().localeCompare(a._id.toString()))
          .slice(0, 5)
      );
      setLoading(false);
    });
  }, []);

  if (loading) return <AdminLoader label="Loading dashboard…" />;

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Welcome header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Medals N Bongs — Admin Panel
          </p>
        </div>
        <Link href="/admin/heroes/new" className="btn-primary">
          + Add Hero
        </Link>
      </div>

      {/* ── Stats row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon="★"  label="Total Heroes"  value={stats.totalHeroes} href="/admin/heroes"  delay={0.04} />
        <StatCard icon="✓"  label="Published"     value={stats.published}   href="/admin/heroes"  delay={0.08}
          sub={stats.published > 0 ? `${Math.round((stats.published / Math.max(stats.totalHeroes, 1)) * 100)}% of total` : undefined} />
        <StatCard icon="✎"  label="Drafts"        value={stats.drafts}      href="/admin/heroes"  delay={0.12}
          sub={stats.drafts > 0 ? "Unpublished" : "All published"} />
        <StatCard icon="🎖" label="Medal Types"   value={stats.medalTypes}  href="/admin/medals"  delay={0.16} />
        <StatCard icon="👤" label="Admin Users"   value={stats.adminUsers}  href="/admin/users"   delay={0.20} />
      </div>

      {/* ── Main grid: recent heroes + quick actions ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent heroes */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">Recent Heroes</h2>
            <Link href="/admin/heroes" className="text-xs text-[var(--color-gold)] hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentHeroes.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-[var(--color-border)] rounded-xl">
                <p className="text-sm text-[var(--color-text-muted)]">No heroes yet.</p>
                <Link href="/admin/heroes/new" className="text-xs text-[var(--color-gold)] hover:underline mt-1 block">
                  Add the first hero →
                </Link>
              </div>
            ) : recentHeroes.map((hero, idx) => (
              <Link
                key={hero._id}
                href={`/admin/heroes/${hero._id}/edit`}
                className="hero-card flex items-center gap-3 p-3 animate-fade-in-up group"
                style={{ animationDelay: `${0.04 + idx * 0.04}s` }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  {hero.avatarUrl ? (
                    <img src={hero.avatarUrl} alt={hero.name} className="w-full h-full object-cover" />
                  ) : (
                    <AvatarFallback name={hero.name} size={40} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate group-hover:text-[var(--color-gold)] transition-colors">
                    {hero.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {hero.rank}{hero.branch ? ` · ${hero.branch}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[var(--color-gold)]">{hero.score}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">pts</p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium border hidden sm:block min-w-[46px] text-center ${
                    hero.published
                      ? "bg-green-500/15 text-green-600 border-green-500/30"
                      : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                  }`}
                >
                  {hero.published ? "Live" : "Draft"}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-base font-bold mb-3">Quick Actions</h2>
          <div className="space-y-3">
            <ActionCard
              icon="＋"
              title="Add New Hero"
              desc="Create a hero entry with medals and scoring."
              href="/admin/heroes/new"
              primary
              delay={0.08}
            />
            <ActionCard
              icon="🎖"
              title="Medal Types"
              desc="Manage medal definitions and ribbon colors."
              href="/admin/medals"
              delay={0.12}
            />
            <ActionCard
              icon="⚙"
              title="Scoring Rules"
              desc="Configure USM-25 scoring parameters."
              href="/admin/scoring"
              delay={0.16}
            />
            <ActionCard
              icon="👤"
              title="Manage Users"
              desc="Add or update admin panel accounts."
              href="/admin/users"
              delay={0.20}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Admin home: dashboard or redirect to unified login / submit ─────────── */
export default function AdminHomePage() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setIsAuthed(true);
        setIsSuperAdmin(data.isSuperAdmin || false);
      })
      .catch(() => setIsAuthed(false));
  }, []);

  useEffect(() => {
    if (isAuthed === false) {
      router.replace("/login?role=admin&next=" + encodeURIComponent("/admin"));
    }
  }, [isAuthed, router]);

  useEffect(() => {
    if (isAuthed === true && !isSuperAdmin) {
      router.replace("/admin/submit");
    }
  }, [isAuthed, isSuperAdmin, router]);

  if (isAuthed === true && isSuperAdmin) return <AdminDashboard />;
  return null;
}
