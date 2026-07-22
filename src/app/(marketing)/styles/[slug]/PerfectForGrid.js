"use client";

import { useState } from "react";
import Image from "next/image";
import { Box, Typography } from "@mui/material";
import { STYLE_ICONS as ICONS } from "@/_utils/styleIcons";
import UseCaseModal from "@/_components/UseCaseModal";

// Different portrait ratios per column so the Perfect For cards stagger
// like a Pinterest board instead of lining up as uniform squares.
const PERFECT_FOR_RATIO = "4 / 5";

export default function PerfectForGrid({ perfectFor }) {
  const [modalIndex, setModalIndex] = useState(null);
  const modalOpen = modalIndex !== null;

  // Only the first 3 cards are ever displayed (Pinterest-style 3-column
  // masonry), so the modal only ever cycles through those same 3 — not
  // any cards beyond the slice.
  const displayedCards = perfectFor.slice(0, 3);
  const items = displayedCards.map((card) => ({
    id: card.title,
    category: card.title,
    description: card.description,
    image: card.imageUrl,
    Icon: ICONS[card.icon],
  }));

  const closeModal = () => setModalIndex(null);
  const showNext = () => setModalIndex((i) => (i + 1) % items.length);
  const showPrevious = () => setModalIndex((i) => (i - 1 + items.length) % items.length);

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          alignItems: "start",
          gap: 2,
        }}
      >
        {displayedCards.map((card, i) => {
          const Icon = ICONS[card.icon];
          return (
            <Box
              key={card.title}
              onClick={() => setModalIndex(i)}
              sx={{
                aspectRatio: PERFECT_FOR_RATIO,
                position: "relative",
                overflow: "hidden",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                cursor: "pointer",
              }}
            >
              {card.imageUrl && (
                <Image
                  src={card.imageUrl}
                  alt={card.title}
                  fill
                  unoptimized
                  sizes="(max-width: 600px) 100vw, 33vw"
                  style={{ objectFit: "cover" }}
                />
              )}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(0deg, rgba(0,0,0,0.8), rgba(0,0,0,0) 30%)",
                }}
              />
              <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, p: 2.5 }}>
                {Icon && <Icon sx={{ color: "primary.main", fontSize: 26, mb: 1 }} />}
                <Typography sx={{ fontWeight: 600, fontSize: "1rem", mb: 0.5, color: "text.primary" }}>
                  {card.title}
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "text.muted", lineHeight: 1.5 }}>
                  {card.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <UseCaseModal
        open={modalOpen}
        items={items}
        index={modalIndex ?? 0}
        onClose={closeModal}
        onNext={showNext}
        onPrevious={showPrevious}
      />
    </>
  );
}
