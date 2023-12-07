// Libraries imports
import { useState, useEffect, useRef } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";
import { Grid, Box, Typography, Button } from "@mui/material";

// App imports
import { useImages } from "../../context/AppProvider";
import ImageCard from "./ImagesCard";
import ImageModal from "./ImageModal";
import { useImageUtils } from "../../utils/ImageUtils";
import FilterPanelDesktop from "./FilterPanelDesktop";
import FilterPanelMobile from "./FilterPanelMobile";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function ImageGallery(props) {
  /* --------------------------- DECLARE VARIABLES ---------------------------- */

  // Props
  const { setTabValue, imageType, handleLogin } = props;

  // Context Variables
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

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Ref for infinite scrolling
  const loadMoreRef = useRef(null);

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
      id: "sd_model",
      name: "SD Model",
      options: sd_models.map((model) => model.name),
    },
  ];

  // Selected Filters
  const [selectedFilters, setSelectedFilters] = useState({
    likes: null,
    time_period: null,
    sd_model: null,
    sort: "Newest",
  });

   // Upscaling (loading)
   const [upscaling, setUpscaling] = useState([]);

  // Set userImages vs communityImages
  const page =
    imageType === "userImages" ? userImagesPage : communityImagesPage;
  const images = imageType === "userImages" ? userImages : communityImages;
  const loading =
    imageType === "userImages" ? loadingUserImages : loadingCommunityImages;

  //Image Details Modal
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Apply Filter & Sort and load Images
  const applyFilters = async (newSelectedFilters) => {
    const sdModelObject = sd_models.find(
      (model) => model.name === newSelectedFilters.sd_model
    );
    const sd_name = sdModelObject ? sdModelObject.sd_name : null;

    const params = {
      page: 1,
      user_id: imageType === "userImages" ? user._id : null,
      exclude_user_id: imageType === "userImages" ? null : user._id,
      likes: newSelectedFilters.likes,
      time_period: newSelectedFilters.time_period,
      sd_model: sd_name,
      sort_by: newSelectedFilters.sort,
    };
    getMoreImages(imageType, params);
  };

  // Infinite scrolling and load Image
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "5px",
      threshold: 1,
    };

    const currentLoadMoreRef = loadMoreRef.current;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (
          entry.isIntersecting &&
          (user._id || imageType === "communityImages")
        ) {
          const sdModelObject = sd_models.find(
            (model) => model.name === selectedFilters.sd_model
          );
          const sd_name = sdModelObject ? sdModelObject.sd_name : null;

          const params = {
            page: page + 1,
            user_id: imageType === "userImages" ? user._id : null,
            exclude_user_id: imageType === "userImages" ? null : user._id,
            likes: selectedFilters.likes,
            time_period: selectedFilters.time_period,
            sd_model: sd_name,
          };

          getMoreImages(imageType, params);
        }
      });
    }, options);

    if (currentLoadMoreRef) {
      observer.observe(currentLoadMoreRef);
    }

    return () => {
      if (currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, loading, user]);

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

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return !user._id && imageType === "userImages" ? (
    /* --------------------------- USER NOT LOGGED IN --------------------------- */
    <Box
      sx={{
        padding: { xs: "0.5rem", sm: "1rem" },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        height: "calc(100vh - 75px)",
      }}
    >
      <Typography variant="h5" component="h2" sx={{ textAlign: "center", mb:2 }}>
        Log in to your account and go QR-azy!
      </Typography><Button variant='contained' onClick={handleLogin}>Login</Button>
    </Box>
  ) : images.length === 0 && page === -1 && imageType === "userImages" ? (
    /* --------------------------- NO USER IMAGES --------------------------- */
    <Box
      sx={{
        padding: { xs: "0.5rem", sm: "1rem" },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        height: "100%",
        height: "calc(100vh - 75px)",
      }}
    >
      <Typography variant="h5" component="h2" sx={{ textAlign: "center" }}>
        You don't have any images yet!
      </Typography>
    </Box>
  ) : (
    <Box sx={{ padding: { xs: "0.5rem", sm: "1rem" } }}>
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
          images.map((item, index) => (
            <ImageCard
              item={item}
              index={index}
              key={index}
              variant="image"
              onClick={() => handleModalOpen(index)}
              setTabValue={setTabValue}
              imageType={imageType}
              upscaling={upscaling}
            />
          ))}
      </Grid>

      {/* Trigger for loading more images */}
      {!loading && page >= 0 && (
        <div ref={loadMoreRef} style={{ height: "10px" }}></div>
      )}

      {/* --------------------------- SKELETON CARDS -------------------------- */}
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
            <ImageCard item={_} variant="skeleton" index={index} key={index} />
          ))}
      </Grid>

      {/* ------------------------ IMAGE DETAILS MODAL ----------------------- */}
      {images != [] && (
        <ImageModal
          open={modalOpen}
          index={selectedImageIndex}
          handleClose={handleModalClose}
          handlePrevious={showPreviousImage}
          handleNext={showNextImage}
          imageType={imageType}
          upscaling={upscaling}
          setUpscaling={setUpscaling}
        />
      )}
    </Box>
  );
}

export default ImageGallery;
