"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Skeleton,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

import ImageModal from "@/app/(main_pages)/mycodes/ImageModal";
import LikeButton from "@/_components/actions/LikeButton";
import { getImages } from "@/_utils/ImagesUtils";
import { useStore } from "@/store";
import theme from "@/_styles/theme";

const IMAGES_PER_PAGE = 12;

function getImageAspect(image) {
  if (!image.width || !image.height) return "square";
  const r = image.width / image.height;
  if (r > 1.2) return "landscape";
  if (r < 0.8) return "portrait";
  return "square";
}

// Every 7th image (index 0, 7, 14, …) that is square becomes a 2×2 hero.
function isHero(image, index) {
  return getImageAspect(image) === "square" && index % 7 === 0;
}

function itemLayout(image, index) {
  if (isHero(image, index)) {
    return { gridColumn: "span 2", gridRow: "span 2", aspectRatio: "1/1" };
  }
  const aspect = getImageAspect(image);
  // Landscape spans 2 columns but keeps square height so rows stay consistent.
  if (aspect === "landscape") return { gridColumn: "span 2", aspectRatio: "1/1" };
  // Portrait and square both render as 1×1 — objectFit cover handles cropping.
  return { gridColumn: "span 1", aspectRatio: "1/1" };
}

const GRID_SX = {
  display: "grid",
  gridAutoFlow: "row dense",
  gap: "8px",
};

const ITEM_BASE_SX = {
  position: "relative",
  border: "0.5px solid",
  borderColor: "primary.main",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "transform 0.15s, border-color 0.2s",
  "&:hover": {
    transform: "scale(1.015)",
    borderColor: "primary.light",
  },
};

export default function Explore() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useStore();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const gridCols = isMdUp ? 3 : 2;
  const sentinelRef = useRef(null);
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);

  // Initial load
  useEffect(() => {
    getImages({ featured: true, page: 1, images_per_page: IMAGES_PER_PAGE })
      .then((imgs) => {
        const list = imgs ?? [];
        setImages(list);
        if (list.length < IMAGES_PER_PAGE) setHasMore(false);
      })
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  // Infinite scroll: observe sentinel div at bottom of grid
  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || fetchingRef.current) return;
        fetchingRef.current = true;
        setLoadingMore(true);

        const nextPage = pageRef.current + 1;
        pageRef.current = nextPage;

        getImages({ featured: true, page: nextPage, images_per_page: IMAGES_PER_PAGE })
          .then((newImgs) => {
            const list = newImgs ?? [];
            if (list.length === 0) {
              setHasMore(false);
            } else {
              setImages((prev) => [...prev, ...list]);
              if (list.length < IMAGES_PER_PAGE) setHasMore(false);
            }
          })
          .catch(() => setHasMore(false))
          .finally(() => {
            fetchingRef.current = false;
            setLoadingMore(false);
            setPageLoaded((n) => n + 1);
          });
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore, pageLoaded]);

  const handleModalOpen = (index) => {
    setSelectedImageIndex(index);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedImageIndex(null);
  };

  const showPreviousImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const showNextImage = () => {
    setSelectedImageIndex((prev) =>
      prev < images.length - 1 ? prev + 1 : 0
    );
  };

  const customLikeAction = (imageId, updatedLikes) => {
    setImages((prev) => {
      const idx = prev.findIndex((img) => img._id === imageId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], likes: updatedLikes };
      return updated;
    });
  };

  if (loading) {
    return (
      <Box sx={{ padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" } }}>
        <Box sx={{ ...GRID_SX, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
          {Array.from({ length: 8 }, (_, i) => {
            const skelHero = i === 0;
            return (
              <Box
                key={i}
                sx={{
                  gridColumn: skelHero ? "span 2" : "span 1",
                  gridRow: skelHero ? "span 2" : undefined,
                  aspectRatio: skelHero ? undefined : "1/1",
                  position: "relative",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <Skeleton
                  variant="rectangular"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    bgcolor: "#2a2a2a",
                    borderRadius: "12px",
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  if (images.length === 0) {
    return (
      <Box
        sx={{
          padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography variant="h5" sx={{ textAlign: "center" }}>
          No featured images yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" } }}>
      <Box sx={{ ...GRID_SX, gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        {images.map((image, index) => {
          const { gridColumn, gridRow, aspectRatio } = itemLayout(image, index);
          return (
            <Box
              key={image._id}
              sx={{
                ...ITEM_BASE_SX,
                gridColumn,
                ...(gridRow && { gridRow }),
                ...(aspectRatio && { aspectRatio }),
              }}
              onClick={() => handleModalOpen(index)}
            >
              <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "12px" }}>
                <Box
                  component="img"
                  src={image.watermarked_image_url}
                  alt={image.prompt ?? ""}
                  loading="lazy"
                  onContextMenu={(e) => e.preventDefault()}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />

                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 55%)",
                    pointerEvents: "none",
                  }}
                />

                <Box
                  sx={{ position: "absolute", top: 8, right: 8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <LikeButton
                    image={image}
                    user={user}
                    customLikeAction={customLikeAction}
                  />
                </Box>

                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: "10px 12px",
                    pointerEvents: "none",
                  }}
                >
                  {image.style_title && (
                    <Chip
                      label={image.style_title.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: "#2a2a2a",
                        color: "primary.light",
                        fontWeight: 700,
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        height: "22px",
                        borderRadius: "999px",
                        mb: 0.6,
                      }}
                    />
                  )}
                  {image.prompt && (
                    <Typography
                      sx={{
                        fontSize: "12px",
                        color: "#e0e0e0",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {image.prompt}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Sentinel div — triggers next page load when scrolled into view */}
      <Box
        ref={sentinelRef}
        sx={{ height: 80, display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        {loadingMore && <CircularProgress size={28} sx={{ color: "primary.light" }} />}
      </Box>

      {images.length > 0 && (
        <ImageModal
          open={modalOpen}
          index={selectedImageIndex}
          handleClose={handleModalClose}
          handlePrevious={showPreviousImage}
          handleNext={showNextImage}
          images={images}
          setImages={setImages}
          customLikeAction={customLikeAction}
        />
      )}
    </Box>
  );
}
