"use client";
// Libraries imports
import { useState, useEffect } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { usePathname } from "next/navigation";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Grid, Box, Typography, Button } from "@mui/material";

// App imports
import ImageCard from "./ImagesCard";
import ImageModal from "./ImageModal";
import FilterPanelDesktop from "./FilterPanelDesktop";
import FilterPanelMobile from "./FilterPanelMobile";
import { styles } from "@/_utils/ImageStyles";
import theme from "@/_styles/theme";
import { useStore } from "@/store";
import { getImages } from "@/_utils/ImagesUtils";

export default function MyCodes() {
  /* --------------------------- DECLARE VARIABLES ---------------------------- */
  const router = useRouter();

  const pathname = usePathname();

  // User
  const user = useStore.getState().user;
  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(0);

  // Intersection Observer
  const { ref, inView } = useInView({});
  // Sort & Filter Options
  const filters = [
    {
      id: "sort",
      name: "Sort",
      options: ["Newest", "Oldest", "Most Liked"],
    },
    {
      id: "likes",
      name: "Likes",
      options: ["Liked by me"],
    },
    {
      id: "time_period",
      name: "Time Period",
      options: ["Today", "This Week", "This Month", "This Year"],
    },
    {
      id: "image_style",
      name: "Style",
      options: styles.map((style) => style.title),
    },
  ];

  // Selected Filters
  const [selectedFilters, setSelectedFilters] = useState({
    likes: undefined,
    time_period: undefined,
    image_style: undefined,
    sort: pathname === "/mycodes" ? "Newest" : "Most Liked",
  });
  // console.log(selectedFilters);

  // Upscaling (loading)
  const [upscaling, setUpscaling] = useState([]);

  //Image Details Modal
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  /* -------------------------------- FUNCTIONS ------------------------------- */
  useEffect(() => {
    setPage(0);
    setImages([]);
  }, [pathname]);

  const loadMoreImages = async (params) => {
    const newImages = await getImages(params);
    setImages([...images, ...newImages]);
    if (newImages.length < 12) {
      setPage(-1);
    } else {
      setPage(page + 1);
    }
  };

  // Apply Filter & Sort and load Images
  const applyFilters = () => {
    setPage(0);
    setImages([]);
  };

  // Infinite scrolling and load Image
  useEffect(() => {
    if (inView) {
      const params = {
        page: page + 1,
        user_id: pathname === "/mycodes" ? user._id : undefined,
        exclude_user_id: pathname === "/mycodes" ? undefined : user._id,
        likes: selectedFilters.likes,
        time_period: selectedFilters.time_period,
        image_style: selectedFilters.image_style,
        sort_by: selectedFilters.sort,
      };
      loadMoreImages(params);
    }
  }, [inView]);

  // Images Details Modal
  const handleModalClose = (event) => {
    setModalOpen(false);
    setSelectedImageIndex(null);
  };

  const handleModalOpen = (imageIndex) => {
    setSelectedImageIndex(imageIndex);
    setModalOpen(true);
  };

  const showPreviousImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : images.length - 1
    );
  };

  const showNextImage = () => {
    setSelectedImageIndex((prevIndex) =>
      prevIndex < images.length - 1 ? prevIndex + 1 : 0
    );
  };

  // update Likes
  const customLikeAction = (imageId, updatedLikes) => {
    const index = images.findIndex((img) => img._id === imageId);
    const updatedImage = { ...images[index], likes: updatedLikes };

    // Create a new array with the updated image
    const updatedImages = [...images];
    updatedImages[index] = updatedImage;
    setImages(updatedImages);
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  if (!user._id && pathname === "/mycodes") {
    router.push("/generate");
    }

  return images.length === 0 && page === -1 && pathname === "/mycodes" ? (
    /* --------------------------- NO USER IMAGES --------------------------- */
    <Box
      sx={{
        padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        height: "100vh",
        width: "100%"
      }}
    >
      <Typography variant="h5" component="h2" sx={{ textAlign: "center" }}>
        You don't have any images yet!
      </Typography>
    </Box>
  ) : (
    <Box sx={{ padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" } }}>
      {/* ----------------------------- FILTERS ----------------------------- */}
      {isMobile ? (
        <FilterPanelMobile
          filters={filters}
          applyFilters={applyFilters}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
        />
      ) : (
        <FilterPanelDesktop
          filters={filters}
          applyFilters={applyFilters}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
        />
      )}

      {/* --------------------------- IMAGES LIST ------------------------- */}
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
        spacing={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
        sx={{ mb: "1.5rem" }}
      >
        {images &&
          images.map((image, index) => (
            <ImageCard
              image={image}
              index={index}
              key={index}
              variant="image"
              handleCardClick={() => handleModalOpen(index)}
              upscaling={upscaling}
              customLikeAction={customLikeAction}
            />
          ))}
      </Grid>

      {/* --------------------------- SKELETON CARDS -------------------------- */}
      {page >= 0 && (
        <Grid
          ref={ref}
          container
          direction="row"
          justifyContent="center"
          alignItems="stretch"
          columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
          spacing={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
          sx={{ mb: "1.5rem" }}
        >
          {Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
            <ImageCard item={_} variant="skeleton" index={index} key={index} />
          ))}
        </Grid>
      )}

      {/* ------------------------ IMAGE DETAILS MODAL ----------------------- */}
      {images != [] && (
        <ImageModal
          open={modalOpen}
          index={selectedImageIndex}
          handleClose={handleModalClose}
          handlePrevious={showPreviousImage}
          handleNext={showNextImage}
          pathname={pathname}
          upscaling={upscaling}
          setUpscaling={setUpscaling}
          images={images}
          setImages={setImages}
          customLikeAction={customLikeAction}
        />
      )}
    </Box>
  );
}
