"use client";

import { ImageIcon, Plus } from "lucide-react";

export interface AreaData {
  id: string;
  name: string;
  text: string;
  score: number;
  imageUrl: string;
}

interface PolaroidCardProps {
  area: AreaData;
  rotation: number;
  onClick: () => void;
  isEmpty?: boolean;
}

export default function PolaroidCard({
  area,
  rotation,
  onClick,
  isEmpty,
}: PolaroidCardProps) {
  const hasContent = area.text.trim().length > 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer select-none"
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
        width: "176px",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        filter: "drop-shadow(0 6px 16px rgba(28,25,23,0.13))",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation * 0.3}deg) scale(1.04)`;
        (e.currentTarget as HTMLDivElement).style.filter =
          "drop-shadow(0 10px 24px rgba(28,25,23,0.2))";
        (e.currentTarget as HTMLDivElement).style.zIndex = "10";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation}deg) scale(1)`;
        (e.currentTarget as HTMLDivElement).style.filter =
          "drop-shadow(0 6px 16px rgba(28,25,23,0.13))";
        (e.currentTarget as HTMLDivElement).style.zIndex = "";
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          padding: "9px 9px 12px",
          borderRadius: "3px",
        }}
      >
        {/* Image area */}
        <div
          style={{
            width: "158px",
            height: "118px",
            backgroundColor: "#F2EAE0",
            borderRadius: "2px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {area.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={area.imageUrl}
              alt={area.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ImageIcon size={20} style={{ color: "#D5C9BC" }} />
              <span style={{ fontSize: "9px", color: "#A8A29E" }}>
                Add vision image
              </span>
            </div>
          )}

          {/* Add overlay on empty */}
          {!hasContent && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(250,245,238,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#F97316",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={14} color="#fff" />
              </div>
            </div>
          )}
        </div>

        {/* Text area */}
        <div style={{ paddingTop: "8px", paddingLeft: "2px" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#1C1917",
              marginBottom: "3px",
              lineHeight: 1.2,
            }}
          >
            {area.name}
          </p>
          <p
            style={{
              fontSize: "10px",
              color: "#78716C",
              marginBottom: "4px",
              fontWeight: 500,
            }}
          >
            10-year vision
          </p>

          {hasContent ? (
            <>
              <p
                style={{
                  fontSize: "11px",
                  color: "#44403C",
                  lineHeight: 1.5,
                  marginBottom: "6px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {area.text}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#C9A84C",
                    lineHeight: 1,
                  }}
                >
                  {area.score}
                </span>
                <span style={{ fontSize: "13px", color: "#78716C", fontWeight: 500 }}>/10</span>
              </div>
            </>
          ) : (
            <p style={{ fontSize: "11px", color: "#A8A29E" }}>
              Click to add your vision
            </p>
          )}
        </div>
      </div>

      {/* Pin dot */}
      <div
        style={{
          position: "absolute",
          top: "-8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: "#C9A84C",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          border: "2px solid #FAF5EE",
        }}
      />
    </div>
  );
}
