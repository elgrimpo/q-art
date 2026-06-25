"use client";

import { useEffect, useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import ImageCard from "@/app/(main_pages)/mycodes/ImagesCard";
import ImageModal from "@/app/(main_pages)/mycodes/ImageModal";
import { getImages } from "@/_utils/ImagesUtils";

export default function Explore() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

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
    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
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
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="stretch"
          columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
          spacing={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <ImageCard variant="skeleton" index={i} key={i} />
          ))}
        </Grid>
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
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
        spacing={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
        sx={{ mb: "1.5rem" }}
      >
        {images.map((image, index) => (
          <ImageCard
            image={image}
            index={index}
            key={index}
            variant="image"
            handleCardClick={() => handleModalOpen(index)}
            customLikeAction={customLikeAction}
          />
        ))}
      </Grid>

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
