"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Box, IconButton, Typography } from "@mui/material";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import ImageModal from "@/app/(main_pages)/mycodes/ImageModal";

const VISIBLE = 4;
const CARD_WIDTH = 170;
const GAP = 16;

/**
 * Horizontally-paged example strip (4 visible + a next button) that opens
 * the same ImageModal used on /mycodes and /explore, instead of navigating
 * to /images/[id] — that full page currently 500s in dev on a missing
 * react-share vendor chunk, and a modal is the better UX here anyway.
 */
export default function ExamplesCarousel({ initialExamples, styleTitle }) {
  const [examples, setExamples] = useState(initialExamples);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const scrollerRef = useRef(null);

  const updateAtEnd = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    updateAtEnd();
  }, [examples]);

  if (examples.length === 0) {
    return (
      <Typography sx={{ color: "text.muted", fontStyle: "italic" }}>
        Examples coming soon — be the first to generate one.
      </Typography>
    );
  }

  const scrollNext = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: (CARD_WIDTH + GAP) * VISIBLE, behavior: "smooth" });
  };

  const handleOpen = (index) => {
    setSelectedIndex(index);
    setModalOpen(true);
  };
  const handleClose = () => {
    setModalOpen(false);
    setSelectedIndex(null);
  };
  const showPrevious = () =>
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : examples.length - 1));
  const showNext = () =>
    setSelectedIndex((prev) => (prev < examples.length - 1 ? prev + 1 : 0));
  const customLikeAction = (imageId, updatedLikes) => {
    setExamples((prev) => {
      const idx = prev.findIndex((img) => img._id === imageId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], likes: updatedLikes };
      return updated;
    });
  };

  return (
    <Box sx={{ position: "relative", maxWidth: VISIBLE * (CARD_WIDTH + GAP) - GAP }}>
      <Box
        ref={scrollerRef}
        onScroll={updateAtEnd}
        sx={{
          display: "flex",
          gap: `${GAP}px`,
          overflowX: "auto",
          pb: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {examples.map((img, i) => (
          <Box
            key={img._id}
            onClick={() => handleOpen(i)}
            sx={{ width: CARD_WIDTH, flex: "0 0 auto", cursor: "pointer" }}
          >
            <Box
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                aspectRatio: "1 / 1",
                position: "relative",
              }}
            >
              <Image
                src={img.watermarked_image_url}
                alt={img.prompt || `${styleTitle} QR code example`}
                fill
                sizes={`${CARD_WIDTH}px`}
                style={{ objectFit: "cover" }}
              />
            </Box>
            <Typography
              sx={{
                mt: 1,
                fontSize: "0.78rem",
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {img.prompt || `${styleTitle} QR code`}
            </Typography>
          </Box>
        ))}
      </Box>

      {!atEnd && (
        <IconButton
          onClick={scrollNext}
          aria-label="Show more examples"
          sx={{
            position: "absolute",
            right: -16,
            top: "32%",
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { backgroundColor: "background.paper" },
          }}
        >
          <ChevronRightOutlined />
        </IconButton>
      )}

      <ImageModal
        open={modalOpen}
        index={selectedIndex ?? 0}
        images={examples}
        setImages={setExamples}
        handleClose={handleClose}
        handleNext={showNext}
        handlePrevious={showPrevious}
        customLikeAction={customLikeAction}
      />
    </Box>
  );
}
