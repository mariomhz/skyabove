import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SKYABOVE — Real-Time Flight Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 128,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          SKYABOVE
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            opacity: 0.5,
            marginTop: 32,
          }}
        >
          Real-Time Flight Dashboard
        </div>
      </div>
    ),
    { ...size }
  );
}
