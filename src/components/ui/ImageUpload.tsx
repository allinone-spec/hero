"use client";

import { useRef, useState } from "react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder,
  label = "Image",
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

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();

    setUploading(false);
    if (res.ok) {
      onChange(data.url);
    } else {
      setError(data.error || "Upload failed");
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <img
          src={value}
          alt={label}
          className="h-20 w-20 object-contain rounded border border-[var(--color-border)]"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secondary text-xs"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : value ? `Change ${label}` : `Upload ${label}`}
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
