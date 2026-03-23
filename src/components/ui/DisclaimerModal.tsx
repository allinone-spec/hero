"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "disclaimer_agreed";
const EXPIRY_DAYS = 30;

function isAgreed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Number.isNaN(ts)) return false;
    const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return daysSince < EXPIRY_DAYS;
  } catch {
    return false;
  }
}

export default function DisclaimerModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAgreed()) setVisible(true);
  }, []);

  if (!visible) return null;

  const handleAgree = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // storage full or blocked — let them through anyway
    }
    setVisible(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        padding: "1rem",
        animation: "fadeIn 0.3s ease both",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "2rem",
          animation: "scaleIn 0.25s ease both",
        }}
      >
        <h2
          style={{
            color: "var(--color-gold)",
            fontSize: "1.35rem",
            fontWeight: 700,
            marginBottom: "1.25rem",
            textAlign: "center",
          }}
        >
          Site Access &amp; Content Disclaimer
        </h2>

        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          Please read the following carefully before proceeding:
        </p>

        <p
          style={{
            color: "var(--color-text)",
            fontSize: "0.875rem",
            marginBottom: "1.25rem",
            lineHeight: 1.7,
          }}
        >
          By clicking &ldquo;I Agree&rdquo; and entering this site, you
          acknowledge and agree to the following terms:
        </p>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 1.5rem 0",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <li
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.7,
              color: "var(--color-text)",
            }}
          >
            <strong style={{ color: "var(--color-gold)" }}>
              Entertainment Purposes Only:
            </strong>{" "}
            This website and its content are provided strictly for entertainment
            purposes. The information contained herein should not be viewed as
            professional advice (legal, medical, financial, or otherwise).
          </li>

          <li
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.7,
              color: "var(--color-text)",
            }}
          >
            <strong style={{ color: "var(--color-gold)" }}>
              Limitation of Liability:
            </strong>{" "}
            The owner of this site makes no representations as to the accuracy
            or completeness of any information found here. You agree that
            neither the site owner nor its contributors shall be held
            responsible or liable for any errors, omissions, or any losses,
            injuries, or damages arising from the use of this content.
          </li>

          <li
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.7,
              color: "var(--color-text)",
            }}
          >
            <strong style={{ color: "var(--color-gold)" }}>
              Accuracy &amp; Corrections:
            </strong>{" "}
            We strive for quality, but we are human. If you encounter an error
            or outdated information, we encourage you to{" "}
            <a
              href="/suggestions"
              style={{
                color: "var(--color-accent)",
                textDecoration: "underline",
              }}
            >
              let us know
            </a>
            . We will make every reasonable effort to correct the error with
            your guidance and provided information.
          </li>

          <li
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.7,
              color: "var(--color-text)",
            }}
          >
            <strong style={{ color: "var(--color-gold)" }}>
              Assumption of Risk:
            </strong>{" "}
            Your use of any information or materials on this website is entirely
            at your own risk.
          </li>
        </ul>

        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "0.8rem",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          By clicking below, you confirm that you have read, understood, and
          agree to these terms.
        </p>

        <button
          onClick={handleAgree}
          style={{
            display: "block",
            width: "100%",
            padding: "0.8rem 1.5rem",
            backgroundColor: "var(--color-gold)",
            color: "var(--color-badge-text)",
            fontSize: "1rem",
            fontWeight: 700,
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background-color 0.2s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor =
              "var(--color-gold-light)";
            (e.target as HTMLButtonElement).style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor =
              "var(--color-gold)";
            (e.target as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          I Agree
        </button>
      </div>
    </div>
  );
}
