"use client";

import { useRef, useState, useCallback } from "react";
import { Box, Typography } from "@mui/material";

/**
 * Drag-to-compare slider. Shows an "after" image (art QR) as the base layer
 * and a "before" image (plain QR) clipped to the left of the handle. Dragging
 * the handle wipes between the two. Works with mouse, touch, and keyboard.
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  beforeLabel = "Plain QR",
  afterLabel = "As art",
}) {
  const [pct, setPct] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPct(Math.max(0, Math.min(100, next)));
  }, []);

  const onPointerDown = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setFromClientX(e.clientX);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") setPct((p) => Math.max(0, p - 4));
    if (e.key === "ArrowRight") setPct((p) => Math.min(100, p + 4));
  };

  return (
    <Box sx={{ my: 5 }}>
      <Box
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          mx: "auto",
          aspectRatio: "1 / 1",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          userSelect: "none",
          touchAction: "none",
          cursor: "ew-resize",
        }}
      >
        {/* Base layer: art */}
        <Box
          component="img"
          src={afterSrc}
          alt={afterAlt}
          draggable={false}
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Top layer: plain QR, clipped to the left of the handle */}
        <Box
          component="img"
          src={beforeSrc}
          alt={beforeAlt}
          draggable={false}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            clipPath: `inset(0 ${100 - pct}% 0 0)`,
          }}
        />

        {/* Corner labels */}
        <Typography
          sx={{
            position: "absolute", top: 10, left: 10, px: 1, py: 0.25,
            fontSize: "0.7rem", fontWeight: 600, color: "#fff",
            bgcolor: "rgba(0,0,0,0.55)", borderRadius: 1, pointerEvents: "none",
          }}
        >
          {beforeLabel}
        </Typography>
        <Typography
          sx={{
            position: "absolute", top: 10, right: 10, px: 1, py: 0.25,
            fontSize: "0.7rem", fontWeight: 600, color: "#fff",
            bgcolor: "rgba(0,0,0,0.55)", borderRadius: 1, pointerEvents: "none",
          }}
        >
          {afterLabel}
        </Typography>

        {/* Divider + handle */}
        <Box
          role="slider"
          aria-label="Drag to compare plain QR code with art QR code"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={onKeyDown}
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${pct}%`,
            transform: "translateX(-50%)",
            width: 2,
            bgcolor: "#fff",
            boxShadow: "0 0 6px rgba(0,0,0,0.5)",
            outline: "none",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "#fff",
              border: "2px solid",
              borderColor: "primary.main",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
              color: "#111",
              fontWeight: 700,
            }}
          >
            ⟺
          </Box>
        </Box>
      </Box>

      <Typography
        component="p"
        sx={{ textAlign: "center", mt: 1.5, fontSize: "0.85rem", color: "text.muted" }}
      >
        Drag the handle — same link, from a plain QR code to a piece of art.
      </Typography>
    </Box>
  );
}
