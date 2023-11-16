// Libraries imports
import { Grid, Box } from "@mui/material";
import { useState, useEffect, useRef } from "react";

// App imports
import { useImages } from "../../context/AppProvider";
import ImageCard from "./ImagesCard";
import ImageModal from "./ImageModal";
import { useImageUtils } from "../../utils/ImageUtils";
import FilterPanel from "./FilterPanel";

function ImageGallery(props) {
  const {
    userImages,
    loadingUserImages,
    userImagesPage,
    user,
    communityImages,
    loadingCommunityImages,
    communityImagesPage,
    sd_models,
  } = useImages();

  const { getMoreImages } = useImageUtils();
  const [filtersSet, setFiltersSet] = useState({likes: null, time_period: null, sd_model: null});
  const { setTabValue, imageType } = props;
  console.log(filtersSet)

  const page =
    imageType === "userImages" ? userImagesPage : communityImagesPage;
  const images = imageType === "userImages" ? userImages : communityImages;
  const loading =
    imageType === "userImages" ? loadingUserImages : loadingCommunityImages;

  //TODO: Move to FilterPanel?
  const filters = [
    {
      id: "likes",
      name: "Likes",
      param: images.like,
      options: ["Liked", "All"],
    },
    {
      id: "time_period",
      name: "Time Period",
      param: images.created_at,
      options: ["Today", "This Week", "This Month", "This Year", "All"],
    },
    {
      id: "sd_model",
      name: "SD Model",
      param: images.sd_model,
      options: sd_models.map((model) => model.name),
    },
  ];

  // Handle Filter & Sort
  const applyFilters = async (newFiltersSet) => {
    
    const sdModelObject = sd_models.find(
      (model) => model.name === newFiltersSet.sd_model
    );
    const sd_name = sdModelObject ? sdModelObject.sd_name : null;
    
    const params = {
      page: 1,
      user_id: imageType === "userImages" ? user._id : null,
      exclude_user_id: imageType === "userImages" ? null : user._id,
      likes: newFiltersSet.likes,
      time_period: newFiltersSet.time_period,
      sd_model: sd_name,
    };
    console.log(params)

    getMoreImages(imageType, params);
  };

  // --------- Infinite scroll -----------
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "5px",
      threshold: 1, // Adjust this threshold value as needed
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const params = {
            page: page + 1,
            user_id: imageType === "userImages" ? user._id : null,
            exclude_user_id: imageType === "userImages" ? null : user._id,
            likes: filtersSet.likes,
            time_period: filtersSet.time_period,
            sd_model: filtersSet.sd_model,
          };

          getMoreImages(imageType, params);
        }
      });
    }, options);

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [images, loading]);
  // --------- Modal ----------
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [open, setOpen] = useState(false);

  const handleModalClose = (event) => {
    if (event.target === event.currentTarget) {
      setOpen(false);
      setSelectedImageIndex(null);
    }
  };
  const handleModalOpen = (imageIndex) => {
    setSelectedImageIndex(imageIndex);
    setOpen(true);
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

  return (
    <Box sx={{ padding: { xs: "0.5rem", sm: "1rem" } }}>
      <FilterPanel
        filters={filters}
        applyFilters={applyFilters}
        filtersSet={filtersSet}
        setFiltersSet={setFiltersSet}
      />
      {/*------ Images List ------*/}
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
          images.map((item, index) => (
            <ImageCard
              item={item}
              index={index}
              variant="image"
              onClick={() => handleModalOpen(index)}
              setTabValue={setTabValue}
              imageType={imageType}
            />
          ))}
      </Grid>

      {/* Trigger for loading more images */}
      {!loading && page >= 0 && (
        <div ref={loadMoreRef} style={{ height: "10px" }}></div>
      )}

      {/*------ Placeholder Cards ------*/}
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
        spacing={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
        sx={{ mb: "1.5rem" }}
      >
        {loading > 0 &&
          Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
            <ImageCard item={_} variant="skeleton" index={index} />
          ))}
      </Grid>

      {/*----------------- Modal: Image Details----------------*/}
      {images != [] && (
        <ImageModal
          open={open}
          index={selectedImageIndex}
          handleClose={handleModalClose}
          handlePrevious={showPreviousImage}
          handleNext={showNextImage}
          imageType={imageType}
        />
      )}
    </Box>
  );
}

export default ImageGallery;
