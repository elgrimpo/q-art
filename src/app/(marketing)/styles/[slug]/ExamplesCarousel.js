"use client";

import { useState } from "react";
import Image from "next/image";
import { Box, Typography } from "@mui/material";
import ImageModal from "@/app/(main_pages)/mycodes/ImageModal";
import HorizontalScroller from "./HorizontalScroller";

const CARD_WIDTH = 170;

/**
 * Full-width, single-row example strip with prev/next scroll buttons.
 * Opens the same ImageModal used on /mycodes and /explore, instead of
 * navigating to /images/[id] — that full page currently 500s in dev on a
 * missing react-share vendor chunk, and a modal is the better UX here
 * anyway.
 */
export default function ExamplesCarousel({ initialExamples, styleTitle }) {
  const [examples, setExamples] = useState(initialExamples);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (examples.length === 0) {
    return (
      <Typography sx={{ color: "text.muted", fontStyle: "italic" }}>
        Examples coming soon — be the first to generate one.
      </Typography>
    );
  }

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
    <>
      <HorizontalScroller>
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
      </HorizontalScroller>

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
    </>
  );
}
