"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NavigationProgress() {
  const pathname      = usePathname();
  const [prog, setProgress] = useState(0);
  const [visible, setVisible]  = useState(false);
  const prevPath      = useRef(pathname);
  const progressTimer = useRef<ReturnType<typeof setInterval>  | null>(null);
  const hideTimer     = useRef<ReturnType<typeof setTimeout>   | null>(null);

  function startLoader() {
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (hideTimer.current)     clearTimeout(hideTimer.current);
    setProgress(0);
    setVisible(true);
    let p = 0;
    progressTimer.current = setInterval(() => {
      p += Math.random() * 12 + 4;
      if (p >= 85) { p = 85; clearInterval(progressTimer.current!); }
      setProgress(p);
    }, 120);
  }

  function finishLoader() {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(100);
    hideTimer.current = setTimeout(() => setVisible(false), 450);
  }

  // Detect when new page is rendered → finish
  useEffect(() => {
    if (pathname !== prevPath.current) {
      finishLoader();
      prevPath.current = pathname;
    }
  }, [pathname]);

  // Intercept link clicks → start loader
  useEffect(() => {
    const onLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto") ||
        href.startsWith("tel") ||
        anchor.target === "_blank"
      ) return;
      if (href !== prevPath.current) startLoader();
    };
    document.addEventListener("click", onLinkClick);
    return () => document.removeEventListener("click", onLinkClick);
  }, []);

  // Cleanup
  useEffect(() => () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (hideTimer.current)     clearTimeout(hideTimer.current);
  }, []);

  if (!visible) return null;

  const done = prog >= 100;

  return (
    <>
      {/* Background track */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 3,
        zIndex: 9998,
        backgroundColor: "var(--color-gold-light)",
        opacity: 0.18,
      }} />

      {/* Progress fill */}
      <div style={{
        position: "fixed", top: 0, left: 0, height: 3,
        zIndex: 9999,
        width: `${prog}%`,
        background: "linear-gradient(90deg, var(--color-gold), var(--color-gold-light))",
        boxShadow: "0 0 10px var(--color-gold), 0 0 4px var(--color-gold-light)",
        transition: done
          ? "width 0.15s ease, opacity 0.35s ease 0.1s"
          : "width 0.12s ease",
        opacity: done ? 0 : 1,
        borderRadius: "0 2px 2px 0",
      }} />

      {/* 3-D ring spinner — top-right corner */}
      {!done && (
        <div style={{
          position: "fixed", top: 10, right: 14, zIndex: 10000,
        }}>
          <div style={{ position: "relative", width: 26, height: 26 }}>
            {/* outer ring */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "2.5px solid transparent",
              borderTopColor: "var(--color-gold)",
              borderRightColor: "var(--color-gold)",
              animation: "ring3d 1.3s linear infinite",
            }} />
            {/* inner ring */}
            <div style={{
              position: "absolute", inset: 6, borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "var(--color-gold-light)",
              animation: "spin 0.9s linear infinite reverse",
            }} />
          </div>
        </div>
      )}
    </>
  );
}
