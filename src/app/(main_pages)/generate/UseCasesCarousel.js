"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { Box, Typography, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { palette } from "@/_styles/palette";
import UseCaseModal from "@/_components/UseCaseModal";
import { stylesWithLandingPage } from "@/_utils/ImageStyles";
import { STYLE_ICONS } from "@/_utils/styleIcons";

const USE_CASES = stylesWithLandingPage().flatMap((style) =>
  (style.landingPage.perfectFor || []).map((card, i) => ({
    id: `${style.landingPage.slug}-${i}`,
    category: card.title,
    description: card.description,
    image: card.imageUrl,
    Icon: STYLE_ICONS[card.icon],
  }))
);

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function UseCasesCarousel() {
  const [items, setItems] = useState(USE_CASES);
  const [modalIndex, setModalIndex] = useState(null);
  const scrollRef = useRef(null);
  const modalOpen = modalIndex !== null;

  // Shuffle only after mount so server- and client-rendered markup match on
  // hydration; the randomized order then applies on top.
  useLayoutEffect(() => {
    setItems(shuffle(USE_CASES));
  }, []);

  // Reordering the DOM on shuffle can trigger the browser's scroll-anchoring
  // and leave the row scrolled away from the start — force it back to 0.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [items]);

  const scrollByAmount = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const atEnd = el.scrollLeft >= maxScroll - 4;
    const atStart = el.scrollLeft <= 4;

    if (dir > 0 && atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (dir < 0 && atStart) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
    }
  };

  const closeModal = () => setModalIndex(null);
  const showNext = () => setModalIndex((i) => (i + 1) % items.length);
  const showPrevious = () => setModalIndex((i) => (i - 1 + items.length) % items.length);

  // Arrow-key / Escape navigation while the modal is open.
  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "ArrowRight") showNext();
      else if (e.key === "ArrowLeft") showPrevious();
      else if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, items.length]);

  return (
    <Box component="section" sx={{ mt: { xs: 8, lg: 12 }, width: "100%" }}>
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

      {/* Scrollable row */}
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={() => scrollByAmount(-1)}
          aria-label="Previous"
          sx={{
            position: "absolute",
            left: { xs: 4, md: 16 },
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

        <IconButton
          onClick={() => scrollByAmount(1)}
          aria-label="Next"
          sx={{
            position: "absolute",
            right: { xs: 4, md: 16 },
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

        <Box
          ref={scrollRef}
          sx={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            overflowAnchor: "none",
            scrollSnapType: "x mandatory",
            px: { xs: "15%", sm: 3, md: 6 },
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {items.map((useCase, i) => (
            <Box
              key={useCase.id}
              onClick={() => setModalIndex(i)}
              sx={{
                position: "relative",
                flex: "0 0 auto",
                width: { xs: "70%", sm: "50%", md: "30%" },
                aspectRatio: "2/3",
                borderRadius: "12px",
                overflow: "hidden",
                scrollSnapAlign: { xs: "center", sm: "start" },
                cursor: "pointer",
              }}
            >
              <Image
                src={useCase.image}
                alt={`${useCase.category} QR code example`}
                fill
                unoptimized
                style={{ objectFit: "cover" }}
                sizes="(max-width: 600px) 70vw, (max-width: 900px) 50vw, 30vw"
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background:
                    "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)",
                  px: 1.5,
                  pb: 1.5,
                  pt: 4,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                  {useCase.Icon && (
                    <useCase.Icon sx={{ color: "primary.main", fontSize: 14 }} />
                  )}
                  <Typography
                    variant="overline"
                    sx={{
                      color: "primary.main",
                      fontSize: "0.6rem",
                      letterSpacing: "0.08em",
                      lineHeight: 1,
                    }}
                  >
                    {useCase.category}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: "white", fontWeight: 500, fontSize: "0.75rem" }}
                >
                  {useCase.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <UseCaseModal
        open={modalOpen}
        items={items}
        index={modalIndex ?? 0}
        onClose={closeModal}
        onNext={showNext}
        onPrevious={showPrevious}
      />
    </Box>
  );
}
