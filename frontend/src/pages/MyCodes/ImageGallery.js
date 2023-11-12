// Libraries imports
import { Grid } from "@mui/material";
import { useState, useEffect, useRef } from "react";

// App imports
import { useImages, useImagesDispatch } from "../../context/AppProvider";
import ImageCard from "./ImagesCard";
import ImageModal from "./ImageModal";
import { getMoreImages } from "../../utils/ImageUtils";

function ImageGallery(props) {
  const dispatch = useImagesDispatch();
  const {
    userImages,
    loadingUserImages,
    userImagesPage,
    user,
    communityImages,
    loadingCommunityImages,
    communityImagesPage,
  } = useImages();

  const { setTabValue, imageType } = props;

  const page = imageType === "userImages" ? userImagesPage : communityImagesPage;
  const images = imageType === "userImages" ? userImages : communityImages;
  const loading = imageType === "userImages" ? loadingUserImages : loadingCommunityImages;

  
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
            //sort_by: (Optional[str] = "created_at"),
            //sort_order: (Optional[str] = "desc"),
            //images_per_page: (int = 12),
          };

          getMoreImages(imageType, params, page, images, dispatch);
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
    <div>
      {/*------ Images List ------*/}
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={8}
        spacing={3}
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
              imageType = {imageType}
            />
          ))}
      </Grid>

      {/* Trigger for loading more images */}
      {!loading && page >= 0 && (
        <div ref={loadMoreRef}></div>
      )}

      {/*------ Placeholder Cards ------*/}
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={8}
        spacing={3}
      >
        {loading > 0 &&
          Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
            <ImageCard
              item={_}
              variant="skeleton"
              index={index}
            />
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
        />
      )}
    </div>
  );
}

export default ImageGallery;
