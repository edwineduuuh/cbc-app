import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "linear-gradient(145deg, #059669 0%, #10b981 100%)",
          borderRadius: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 340,
            fontWeight: 900,
            color: "#ffffff",
            fontFamily: "Georgia, serif",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            marginTop: 20,
          }}
        >
          S
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
