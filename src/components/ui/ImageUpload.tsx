"use client";

import { useRef, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { safeHttpImageUrl } from "@/lib/safe-image-url";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label?: string;
  /** Defaults to staff /api/upload. Site flows use e.g. /api/site/upload-tribute-image */
  uploadUrl?: string;
  /** Appended to FormData (e.g. { slug } for tribute uploads) */
  extraFormFields?: Record<string, string>;
  previewClassName?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder,
  label = "Image",
  uploadUrl = "/api/upload",
  extraFormFields,
  previewClassName = "h-20 w-20 object-contain rounded border border-[var(--color-border)]",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    if (extraFormFields) {
      for (const [k, v] of Object.entries(extraFormFields)) {
        fd.append(k, v);
      }
    }

    const res = await fetch(uploadUrl, { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();

    setUploading(false);
    if (res.ok) {
      onChange(data.url);
    } else {
      setError(data.error || "Upload failed");
    }
  };

  const previewSrc = safeHttpImageUrl(value);

  return (
    <div className="space-y-2">
      {previewSrc ? (
        <img
          src={previewSrc}
          alt={label}
          className={previewClassName}
          onError={() => onChange("")}
        />
      ) : value.trim() ? (
        <div
          className={`flex items-center justify-center text-xs text-[var(--color-text-muted)] text-center px-2 ${previewClassName}`}
        >
          Invalid image URL — use a valid https link or upload a file
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secondary text-xs inline-flex items-center justify-center gap-2"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <LoadingSpinner size="xs" />
              Uploading…
            </>
          ) : value ? (
            `Change ${label}`
          ) : (
            `Upload ${label}`
          )}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="btn-danger text-xs"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
