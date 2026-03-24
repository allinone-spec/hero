/**
 * Resend `from` domain must match a domain verified at https://resend.com/domains
 *
 * The sender address is built from `NEXT_PUBLIC_APP_URL` as `noreply@<hostname>` (e.g. app URL
 * `https://medalsnbongs.com` → `Medals N Bongs <noreply@medalsnbongs.com>`).
 *
 * Local / unparseable URLs use Resend’s test sender in development only.
 */
const DISPLAY_NAME = "Medals N Bongs";

function hostnameFromNextPublicAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const { hostname } = new URL(withScheme);
    if (!hostname) return null;
    return hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHostname(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

export function getResendFrom(): string {
  const host = hostnameFromNextPublicAppUrl();

  if (host && !isLocalHostname(host)) {
    return `${DISPLAY_NAME} <noreply@${host}>`;
  }

  if (process.env.NODE_ENV === "development") {
    return `${DISPLAY_NAME} <onboarding@resend.dev>`;
  }

  return `${DISPLAY_NAME} <support@medalsnbongs.com>`;
}
