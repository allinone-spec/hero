import type { ImgHTMLAttributes } from "react";
import { normalizeWikimediaImageUrl } from "@/lib/wikimedia-url";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
};

/**
 * External Wikipedia/Wikimedia (or any) image: normalize URL and avoid referrer blocking.
 */
export function SafeWikimediaImg({ src, alt = "", ...rest }: Props) {
  const u = normalizeWikimediaImageUrl(src);
  if (!u) return null;
  return (
    <img src={u} alt={alt} loading="lazy" {...rest} referrerPolicy="no-referrer" />
  );
}
