"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  ImageList,
  ImageListItem,
  Skeleton,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

import ImageModal from "@/app/(main_pages)/mycodes/ImageModal";
import LikeButton from "@/_components/actions/LikeButton";
import { getImages } from "@/_utils/ImagesUtils";
import { useStore } from "@/store";
import theme from "@/_styles/theme";

// Repeating pattern of item sizes — cycles through images in order.
// cols / rows are relative to the ImageList's total column count.
const SIZE_PATTERN = [
  { cols: 2, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 2 },
  { cols: 1, rows: 1 },
  { cols: 2, rows: 1 },
  { cols: 1, rows: 1 },
  { cols: 1, rows: 1 },
];

function getItemSize(index, totalCols) {
  const p = SIZE_PATTERN[index % SIZE_PATTERN.length];
  return {
    cols: Math.min(p.cols, totalCols),
    rows: p.rows,
  };
}

export default function Explore() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useStore();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const gridCols = isMdUp ? 4 : 2;
  const rowHeight = isMdUp ? 200 : 160;

  useEffect(() => {
    getImages({ featured: true })
      .then((imgs) => setImages(imgs ?? []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

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
        <ImageList variant="quilted" cols={gridCols} rowHeight={rowHeight} gap={8}>
          {Array.from({ length: 8 }, (_, i) => {
            const { cols, rows } = getItemSize(i, gridCols);
            return (
              <ImageListItem key={i} cols={cols} rows={rows}>
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={rowHeight * rows}
                  sx={{ bgcolor: "#2a2a2a", borderRadius: "12px" }}
                />
              </ImageListItem>
            );
          })}
        </ImageList>
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
      <ImageList variant="quilted" cols={gridCols} rowHeight={rowHeight} gap={8}>
        {images.map((image, index) => {
          const { cols, rows } = getItemSize(index, gridCols);
          return (
            <ImageListItem
              key={image._id}
              cols={cols}
              rows={rows}
              sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "12px",
                border: "0.5px solid",
                borderColor: "primary.main",
                cursor: "pointer",
                transition: "transform 0.15s, border-color 0.2s",
                "&:hover": {
                  transform: "scale(1.015)",
                  borderColor: "primary.light",
                },
              }}
              onClick={() => handleModalOpen(index)}
            >
              {/* Image */}
              <Box
                component="img"
                src={image.watermarked_image_url}
                alt={image.prompt ?? ""}
                onContextMenu={(e) => e.preventDefault()}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />

              {/* Gradient overlay */}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 55%)",
                  pointerEvents: "none",
                }}
              />

              {/* Like button — top right */}
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

              {/* Bottom overlay: style chip + prompt */}
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
            </ImageListItem>
          );
        })}
      </ImageList>

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
