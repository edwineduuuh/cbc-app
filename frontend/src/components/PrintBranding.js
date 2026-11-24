/* eslint-disable @next/next/no-img-element */
/**
 * StadiSpace branding that appears only on paper: a faint slanted
 * logo + name watermark on every page, and the footer with domain,
 * learner products, phone numbers and QR. Drop it inside any page
 * that people print.
 */
export default function PrintBranding() {
  return (
    <>
      <style>{`
        .ss-print { display: none; }
        @media print {
          .ss-print { display: block; }
          .ss-print-wm { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
          .ss-print-foot { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; z-index: 2; }
          body { padding-bottom: 28mm !important; }
        }
      `}</style>
      <div className="ss-print ss-print-wm" aria-hidden="true">
        <div style={{ position: "absolute", inset: "-40%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                      rowGap: 150, alignContent: "space-around", justifyItems: "center", transform: "rotate(-30deg)" }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.06 }}>
              <img src="/brand/symbol.svg" alt="" style={{ width: 44, height: 44 }} />
              <span style={{ fontSize: 32, fontWeight: 800, color: "#111827" }}>StadiSpace</span>
            </div>
          ))}
        </div>
      </div>
      <footer className="ss-print ss-print-foot">
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #d1d5db",
                      padding: "6px 12mm 6mm", fontSize: 10, lineHeight: 1.45, color: "#4b5563" }}>
          <img src="/brand/symbol.svg" alt="" style={{ width: 30, height: 30, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ color: "#111827" }}>StadiSpace · <span style={{ color: "#047857" }}>stadispace.co.ke</span></b><br />
            For learners: CBE practice quizzes marked instantly · Interactive lessons · Trivia &amp; flash cards · Books &amp; videos<br />
            Grades 4 - 11 · Call or WhatsApp 0704 699683 / 0717 946 924
          </div>
          <span style={{ fontSize: 9.5, fontWeight: 600, textAlign: "right", color: "#374151" }}>Scan to<br />practise</span>
          <img src="/brand/qr-stadispace.svg" alt="QR code to stadispace.co.ke" style={{ width: 52, height: 52 }} />
        </div>
      </footer>
    </>
  );
}
