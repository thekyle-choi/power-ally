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
          background: "#242424",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Back layer */}
        <div
          style={{
            position: "absolute",
            left: 34,
            top: 56,
            width: 73,
            height: 90,
            borderRadius: 14,
            border: "4px solid rgba(255,255,255,0.3)",
          }}
        />
        {/* Middle layer */}
        <div
          style={{
            position: "absolute",
            left: 56,
            top: 34,
            width: 73,
            height: 90,
            borderRadius: 14,
            border: "4px solid rgba(255,255,255,0.6)",
          }}
        />
        {/* Front layer */}
        <div
          style={{
            position: "absolute",
            left: 78,
            top: 56,
            width: 73,
            height: 90,
            borderRadius: 14,
            background: "rgba(255,255,255,0.95)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
