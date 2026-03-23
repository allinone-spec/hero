/**
 * Adds Cloudinary `e_make_transparent` transformation to a URL,
 * which removes the predominant (white) background colour and
 * delivers the result as a PNG with alpha.
 *
 * Non-Cloudinary URLs and falsy values are returned as-is.
 */
export function transparentBg(url: string | undefined): string | undefined {
  if (!url) return url;
  // Only transform Cloudinary upload URLs
  if (!url.includes("/upload/")) return url;
  // Don't double-apply
  if (url.includes("e_make_transparent")) return url;
  return url.replace("/upload/", "/upload/e_make_transparent/");
}
