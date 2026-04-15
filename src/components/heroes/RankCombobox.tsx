"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MILITARY_RANKS } from "@/lib/military-ranks";

type Props = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
};

export default function RankCombobox({ id, value, onChange, className, required, placeholder }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const needle = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!needle) return MILITARY_RANKS.slice(0, 45);
    return MILITARY_RANKS.filter((r) => r.toLowerCase().includes(needle)).slice(0, 60);
  }, [needle]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [needle, open]);

  function pick(rank: string) {
    onChange(rank);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
          } else if (e.key === "Enter" && open && suggestions[highlight]) {
            e.preventDefault();
            pick(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          className="absolute z-[60] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl text-sm"
          role="listbox"
        >
          {suggestions.map((r, i) => (
            <li key={`${r}::${i}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-[var(--color-text)] hover:bg-[var(--color-gold)]/15 ${
                  i === highlight ? "bg-[var(--color-gold)]/20" : ""
                }`}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(r)}
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
