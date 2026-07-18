"use client";

import { useEffect, useState } from "react";
import { fetchMediaObjectUrl, type MediaScope } from "./api";

/**
 * Mixed-mode image handling for bucket-list / vision images.
 *
 * A stored pointer is either:
 *   • a new R2 media id (a bare UUID) → fetched from the encrypted stream endpoint
 *     as a blob (needs the auth header, so `<img src>` alone can't load it), or
 *   • a legacy Google Drive URL (pre-R2 entries) → normalized and used directly.
 *
 * This is the single place that discriminates the two, so the migration can flip
 * entries over one at a time without touching render sites.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMediaId(p: string | null | undefined): p is string {
  return !!p && UUID_RE.test(p);
}

// Accepted upload formats. HEIC/HEIF are allowed — the server transcodes them to
// WebP (the browser never has to render HEIC). The `.heic`/`.heif` extensions are
// included because some browsers report an empty MIME type for those files.
export const UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif";
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp",
  "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence",
]);
export function isAllowedImageFile(file: File): boolean {
  if (ALLOWED_UPLOAD_TYPES.has(file.type.toLowerCase())) return true;
  return /\.(heic|heif)$/i.test(file.name); // HEIC often reports empty/odd MIME
}

// Convert any Drive URL form (share link, /uc?export=view, lh3 CDN) to the
// reliable thumbnail endpoint. Non-Drive URLs pass through unchanged.
export function toDriveImgUrl(raw: string): string {
  if (!raw) return raw;
  if (raw.includes("drive.google.com/thumbnail?id=")) return raw;

  let id: string | null = null;
  const fileMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) id = fileMatch[1];
  if (!id) {
    const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) id = idMatch[1];
  }
  if (!id) {
    const lh3Match = raw.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match) id = lh3Match[1];
  }
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1500` : raw;
}

/** Resolve a pointer to a usable <img> src, fetching+decrypting R2 blobs as needed. */
export function useVisionSrc(pointer: string | null | undefined, scope: MediaScope, variant: "full" | "thumb" = "full") {
  const [src, setSrc]         = useState("");
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(false);
    if (!pointer) { setSrc(""); setLoading(false); return; }
    if (!isMediaId(pointer)) { setSrc(toDriveImgUrl(pointer)); setLoading(false); return; }

    // R2 media id → fetch as blob, hand back an object URL, revoke on cleanup.
    let cancelled = false;
    let obj = "";
    setSrc("");
    setLoading(true);
    fetchMediaObjectUrl(pointer, scope, variant)
      .then((u) => {
        if (cancelled) { URL.revokeObjectURL(u); return; }
        obj = u; setSrc(u); setLoading(false);
      })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });

    return () => { cancelled = true; if (obj) URL.revokeObjectURL(obj); };
  }, [pointer, scope, variant]);

  return { src, error, loading };
}

interface VisionImgProps {
  pointer:   string | null | undefined;
  scope:     MediaScope;
  variant?:  "full" | "thumb";
  alt?:      string;
  style?:    React.CSSProperties;
  className?: string;
  onError?:  () => void;
}

/** Drop-in <img> for a stored pointer; renders nothing until a src resolves. */
export function VisionImg({ pointer, scope, variant = "full", alt = "", style, className, onError }: VisionImgProps) {
  const { src, error } = useVisionSrc(pointer, scope, variant);

  useEffect(() => { if (error) onError?.(); }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => onError?.()}
    />
  );
}
