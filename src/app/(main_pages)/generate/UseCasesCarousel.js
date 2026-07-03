"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSwipeable } from "react-swipeable";
import { Box, Typography, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import CheckroomOutlinedIcon from "@mui/icons-material/CheckroomOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import MusicNoteOutlinedIcon from "@mui/icons-material/MusicNoteOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import { palette } from "@/_styles/palette";

const USE_CASES = [
  {
    id: "restaurants",
    category: "Restaurants & Food Trucks",
    description: "Share menus, stories, and more with a simple scan.",
    image: "/product-placements/restaurants-food-trucks.png",
    Icon: LocalShippingOutlinedIcon,
  },
  {
    id: "music",
    category: "Music & Nightlife",
    description: "Light up the night. Put your brand center stage.",
    image: "/product-placements/music-nightlife.png",
    Icon: MusicNoteOutlinedIcon,
  },
  {
    id: "events",
    category: "Events & Exhibitions",
    description: "From festivals to gallery openings — make every poster scannable.",
    image: "/product-placements/events-exhibitions.png",
    Icon: EventNoteOutlinedIcon,
  },
  {
    id: "business",
    category: "Business & Branding",
    description: "Stand out. Get discovered. Grow your brand.",
    image: "/product-placements/business-branding.png",
    Icon: StorefrontOutlinedIcon,
  },
  {
    id: "weddings",
    category: "Weddings & Stationery",
    description: "Add a personal, interactive touch to life's moments.",
    image: "/product-placements/weddings-stationery.png",
    Icon: FavoriteBorderIcon,
  },
  {
    id: "art",
    category: "Art Galleries & Museums",
    description: "Bridge the physical and digital art experience.",
    image: "/product-placements/art-galleries.png",
    Icon: AccountBalanceOutlinedIcon,
  },
  {
    id: "apparel",
    category: "Apparel & Merch",
    description: "Wear your art. Share your world.",
    image: "/product-placements/apparel-merch.png",
    Icon: CheckroomOutlinedIcon,
  },
];

const CARD_POSITIONS = {
  farLeft:  { left: "-60%",  opacity: 0,    zIndex: 1, transform: "translateX(-50%) scale(0.75)" },
  left:     { left: "0%",    opacity: 0.55, zIndex: 2, transform: "translateX(-50%) scale(0.82)" },
  center:   { left: "50%",   opacity: 1,    zIndex: 3, transform: "translateX(-50%) scale(1)" },
  right:    { left: "100%",  opacity: 0.55, zIndex: 2, transform: "translateX(-50%) scale(0.82)" },
  farRight: { left: "160%",  opacity: 0,    zIndex: 1, transform: "translateX(-50%) scale(0.75)" },
};

function getCardPosition(normalizedDelta) {
  if (normalizedDelta === 0)  return CARD_POSITIONS.center;
  if (normalizedDelta === -1) return CARD_POSITIONS.left;
  if (normalizedDelta === 1)  return CARD_POSITIONS.right;
  if (normalizedDelta < -1)   return CARD_POSITIONS.farLeft;
  return CARD_POSITIONS.farRight;
}

export default function UseCasesCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const total = USE_CASES.length;

  useEffect(() => {
    if (paused || hasInteracted) return;
    const t = setInterval(() => setCurrent((i) => (i + 1) % total), 4500);
    return () => clearInterval(t);
  }, [paused, hasInteracted, total]);

  const navigate = useCallback(
    (dir) => {
      setHasInteracted(true);
      setCurrent((i) => (i + dir + total) % total);
    },
    [total]
  );

  const goTo = useCallback((index) => {
    setHasInteracted(true);
    setCurrent(index);
  }, []);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigate(1),
    onSwipedRight: () => navigate(-1),
  });

  return (
    <Box
      component="section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{ mt: { xs: 8, lg: 12 }, width: "100%" }}
    >
      {/* Heading */}
      <Box sx={{ textAlign: "center", px: 2, mb: { xs: 5, lg: 6 } }}>
        <Typography
          variant="h2"
          sx={{ fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" }, lineHeight: 1.1 }}
        >
          Made to be seen.
          <br />
          Made to be scanned.
        </Typography>
        <Typography
          variant="h2"
          sx={{
            color: "primary.main",
            fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" },
            lineHeight: 1.1,
          }}
        >
          Made to inspire.
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ mt: 2, color: "text.secondary", maxWidth: 480, mx: "auto" }}
        >
          From city streets to special moments,
          <br />
          Scanvas QR art fits everywhere.
        </Typography>
      </Box>

      {/* Carousel container */}
      <Box
        {...swipeHandlers}
        sx={{
          position: "relative",
          height: { xs: "60vw", sm: "50vw", md: "43vw" },
          maxHeight: { md: "520px" },
          overflow: "hidden",
        }}
      >
        {/* Left arrow */}
        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Previous"
          sx={{
            position: "absolute",
            left: { xs: 8, md: 24 },
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            bgcolor: "rgba(0,0,0,0.45)",
            color: "primary.main",
            border: `0.5px solid ${palette.primary.main}`,
            width: { xs: 36, md: 48 },
            height: { xs: 36, md: 48 },
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>

        {/* Right arrow */}
        <IconButton
          onClick={() => navigate(1)}
          aria-label="Next"
          sx={{
            position: "absolute",
            right: { xs: 8, md: 24 },
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            bgcolor: "rgba(0,0,0,0.45)",
            color: "primary.main",
            border: `0.5px solid ${palette.primary.main}`,
            width: { xs: 36, md: 48 },
            height: { xs: 36, md: 48 },
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
          }}
        >
          <ChevronRightIcon />
        </IconButton>

        {/* Cards */}
        {USE_CASES.map((useCase, i) => {
          const delta = ((i - current) % total + total) % total;
          const norm = delta <= Math.floor(total / 2) ? delta : delta - total;
          const pos = getCardPosition(norm);
          const isCenter = norm === 0;
          const isAdjacent = Math.abs(norm) === 1;

          return (
            <Box
              key={useCase.id}
              onClick={isAdjacent ? () => goTo(i) : undefined}
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: { xs: "100%", md: "58%" },
                borderRadius: { xs: 0, md: "12px" },
                overflow: "hidden",
                cursor: isAdjacent ? "pointer" : "default",
                display: { xs: isCenter ? "block" : "none", md: "block" },
                transition:
                  "left 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease, transform 0.45s cubic-bezier(0.4,0,0.2,1)",
                ...pos,
              }}
            >
              <Image
                src={useCase.image}
                alt={`${useCase.category} QR code example`}
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 768px) 85vw, 60vw"
                priority={i === 0}
              />

              {/* Info overlay — center card only */}
              {isCenter && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background:
                      "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)",
                    px: { xs: 2, md: 3 },
                    pb: { xs: 2, md: 3 },
                    pt: { xs: 5, md: 8 },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                    <useCase.Icon sx={{ color: "primary.main", fontSize: { xs: 16, md: 18 } }} />
                    <Typography
                      variant="overline"
                      sx={{
                        color: "primary.main",
                        fontSize: { xs: "0.65rem", md: "0.75rem" },
                        letterSpacing: "0.08em",
                        lineHeight: 1,
                      }}
                    >
                      {useCase.category}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "white",
                      fontWeight: 500,
                      fontSize: { xs: "0.875rem", md: "1rem" },
                    }}
                  >
                    {useCase.description}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Dot indicators */}
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, mt: 3 }}>
        {USE_CASES.map((useCase, i) => (
          <Box
            key={i}
            role="button"
            aria-label={`Go to ${useCase.category}`}
            onClick={() => goTo(i)}
            sx={{
              width: i === current ? 24 : 8,
              height: 8,
              borderRadius: "4px",
              bgcolor: i === current ? "primary.main" : "rgba(255,255,255,0.22)",
              cursor: "pointer",
              transition: "width 0.3s ease, background-color 0.3s ease",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
