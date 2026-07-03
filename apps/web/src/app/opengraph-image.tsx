import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "JobPilot - your AI job agent";

// Satori renders this - inline styles only, no MUI/emotion, every multi-child div is flex.
export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0B0B0A",
        padding: 80,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 10,
          background: "linear-gradient(90deg, #FF6A3D, #FFB020, #3B82F6)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            background: "linear-gradient(135deg, #FF7A4D, #D9532A)",
            border: "1px solid #FF6A3D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          J
        </div>
        <div style={{ color: "#F4F2EE", fontSize: 40, fontWeight: 700 }}>JobPilot</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            color: "#F4F2EE",
            fontSize: 74,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          Your AI job agent, running on your machine.
        </div>
        <div style={{ color: "#A7A49D", fontSize: 30, lineHeight: 1.4, maxWidth: 940 }}>
          Search any job board, tailor your resume, apply, and track every reply - on your own
          Claude or Codex subscription.
        </div>
      </div>
      <div style={{ display: "flex", color: "#6C6860", fontSize: 24 }}>jobpilot.suxrobgm.net</div>
    </div>,
    { ...size },
  );
}
