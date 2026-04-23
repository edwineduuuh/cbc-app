import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "linear-gradient(145deg, #059669 0%, #10b981 100%)",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: "#ffffff",
            fontFamily: "Georgia, serif",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            marginTop: 8,
          }}
        >
          S
        </span>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
