"use client";

interface Props {
  open: boolean;
  onClose: () => void;
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
}

export default function TermsOfEngagementModal({
  open,
  onClose,
  agreed,
  onAgreedChange,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-lg font-bold">Project Disclosure &amp; Terms of Engagement</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 text-sm text-[var(--color-text-muted)] leading-relaxed space-y-4">
          <div>
            <p className="font-semibold text-[var(--color-text)]">1. Mission Statement &amp; Funding</p>
            <p>
              The All Time Military Hero project is a private, non-commercial endeavor created solely &quot;out of the
              goodness of our hearts&quot; to honor the legacy of those who have demonstrated extraordinary valor across
              all branches of the U.S. Armed Forces (Army, Navy, Marine Corps, Air Force, and Coast Guard). This platform
              is 100% self-funded by a private individual. We do not receive government grants, taxpayer funding, or
              corporate sponsorship. We are not a 501(c)(3) nonprofit; we are simply citizens who believe these stories
              deserve a modern spotlight.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[var(--color-text)]">2. Not an Official Government Record</p>
            <p>
              This website is not affiliated with, endorsed by, or operated by the U.S. Department of Defense (DoD) or any
              specific branch of the military. The data presented here is aggregated from public historical archives,
              Wikipedia, and declassified citations. While we strive for &quot;military-grade&quot; accuracy, we are not
              the official repository of service records.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[var(--color-text)]">3. The Scoring Matrix Rationale</p>
            <p>
              The &quot;Heroism Score&quot; is a proprietary analytical tool (Matrix 2.0) developed for this project. It
              uses a weighted formula based on the historical rarity and official precedence of valor awards.
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>
                <strong>Purpose:</strong> The score is meant to provide a historical perspective on the level of
                gallantry recognized by the military.
              </li>
              <li>
                <strong>Respect for Service:</strong> A score is not a measurement of a human being&apos;s worth or the
                value of their sacrifice. Every service member&apos;s contribution is invaluable; this matrix is simply a
                way to categorize and rank public decorations for historical comparison.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[var(--color-text)]">4. Stolen Valor &amp; Verification</p>
            <p>We hold the sanctity of military service in the highest regard.</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>
                <strong>Zero Tolerance:</strong> Any attempt to submit fraudulent data or &quot;Stolen Valor&quot;
                claims will result in a permanent ban from this platform.
              </li>
              <li>
                <strong>Verification:</strong> We rely on primary source documents (DD-214s, official citations, and
                National Archive records). If a profile is listed here, it is because there is a public or verified
                record of the award.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[var(--color-text)]">5. Data Accuracy &amp; &quot;The Human Factor&quot;</p>
            <p>
              Military record-keeping—especially from WWII, Korea, and Vietnam—is famously complex and occasionally
              contradictory. We recognize that errors in citation text, medal counts, or rank may occur.
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>
                <strong>Our Commitment:</strong> If you see something wrong, we want to fix it. We are dedicated to the
                truth.
              </li>
              <li>
                <strong>The Correction Process:</strong> If you have documented proof of a discrepancy, please submit it
                via our contact portal. We review all credible feedback.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[var(--color-text)]">6. Feedback Policy (Strictly Enforced)</p>
            <p>
              We welcome constructive corrections from historians, veterans, and family members who share our goal of
              honoring these heroes. However, because this is a privately funded volunteer project, we implement a
              Common Sense Clause:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>
                <strong>Zero Tolerance for Hostility:</strong> Pedantic, aggressive, or &quot;troll-like&quot;
                communications will be deleted without response.
              </li>
              <li>
                <strong>No Entitlement:</strong> Using this site is a privilege, not a right. We reserve the right to ban
                users or ignore feedback that is not presented with the respect that a tribute to valor demands.
              </li>
              <li>
                <strong>Legal Safe Harbor:</strong> By using this site, you acknowledge that all information is provided
                &quot;as-is.&quot; We are not liable for emotional distress, perceived inaccuracies, or historical
                debates.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[var(--color-text)]">7. Intellectual Property</p>
            <p>
              The scoring matrix (Matrix 2.0) and the specific editorial presentation of these heroes are the
              intellectual property of this project.
            </p>
          </div>

          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="font-semibold text-[var(--color-text)]">Final Word</p>
            <p>
              We are doing our best with the resources we have. If you have a correction, bring us the facts and we will
              work with you to ensure the hero&apos;s legacy is accurate.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-border)] shrink-0 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => onAgreedChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--color-gold)] shrink-0"
            />
            <span className="text-xs text-[var(--color-text-muted)] leading-snug">
              I have read and agree to the Project Disclosure &amp; Terms of Engagement
            </span>
          </label>
          <button type="button" onClick={onClose} className="btn-primary w-full" disabled={!agreed}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
