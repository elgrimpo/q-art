"use client";

import { useEffect, useRef, useState } from "react";
import { Box, IconButton } from "@mui/material";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";

/**
 * A single-row, horizontally-scrollable strip with prev/next buttons that
 * appear once there's actually more content off-screen in that direction.
 * Used by both the Examples and Perfect For sections on /styles/[slug].
 */
export default function HorizontalScroller({ children, gap = 16 }) {
  const scrollerRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const update = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  // Re-check once children (e.g. fetched examples) are in and laid out.
  useEffect(() => {
    update();
  }, [children]);

  const scroll = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <Box sx={{ position: "relative" }}>
      {!atStart && (
        <IconButton
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          sx={{
            position: "absolute",
            left: -16,
            top: "40%",
            zIndex: 2,
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { backgroundColor: "background.paper" },
          }}
        >
          <ChevronLeftOutlined />
        </IconButton>
      )}

      <Box
        ref={scrollerRef}
        onScroll={update}
        sx={{
          display: "flex",
          gap: `${gap}px`,
          overflowX: "auto",
          pb: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {children}
      </Box>

      {!atEnd && (
        <IconButton
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          sx={{
            position: "absolute",
            right: -16,
            top: "40%",
            zIndex: 2,
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { backgroundColor: "background.paper" },
          }}
        >
          <ChevronRightOutlined />
        </IconButton>
      )}
    </Box>
  );
}
