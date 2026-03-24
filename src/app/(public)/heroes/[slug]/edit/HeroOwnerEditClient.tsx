"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ImageUpload from "@/components/ui/ImageUpload";

const profileOwnerBackClass =
  "text-sm text-[var(--color-text-muted)] hover:text-[var(--color-gold)] inline-flex items-center gap-1";

function ProfileOwnerBackChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

interface Props {
  slug: string;
}

export default function HeroOwnerEditClient({ slug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [biography, setBiography] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const res = await fetch(`/api/site/hero-for-edit?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 401) {
          setError("signin");
          return;
        }
        if (!res.ok) {
          setError(data.error || "Could not load hero");
          return;
        }
        setId(data._id);
        setName(data.name || "");
        setBiography(data.biography || "");
        setAvatarUrl(data.avatarUrl || "");
        setPublished(Boolean(data.published));
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/heroes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biography, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      router.push("/my-heroes");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--color-text-muted)]">Loading…</div>
    );
  }

  if (error === "signin") {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-[var(--color-text-muted)] mb-4">Sign in as the hero owner to edit this page.</p>
        <Link
          href={`/login?role=member&next=${encodeURIComponent(`/heroes/${slug}/edit`)}`}
          className="text-[var(--color-gold)] font-medium hover:underline"
        >
          Member sign in
        </Link>
      </div>
    );
  }

  if (error || !id) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-red-300 mb-4">{error || "Not found"}</p>
        <Link href="/my-heroes" className={profileOwnerBackClass}>
          <ProfileOwnerBackChevron />
          Back to My Heroes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/my-heroes" className={profileOwnerBackClass}>
          <ProfileOwnerBackChevron />
          Back to My Heroes
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mt-2">Edit tribute: {name}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          You can update the short biography and portrait (upload an image or paste a public URL). Medal rack and scoring
          are managed by the archive team.
          {!published && " This hero is not published yet; the public page may be unavailable."}
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Biography</label>
          <textarea
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Portrait</label>
          <ImageUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
            folder="Heroes/TributePortraits"
            label="portrait"
            uploadUrl="/api/site/upload-tribute-image"
            extraFormFields={{ slug }}
            previewClassName="h-44 w-44 object-cover rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-1">
            Or paste a public image URL (https). Invalid or broken links are cleared when the image fails to load.
          </p>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            placeholder="https://…"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg px-5 py-2.5 font-semibold text-[var(--color-badge-text)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
            }}
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
          {published && (
            <Link
              href={`/heroes/${slug}`}
              className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              View public page
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
