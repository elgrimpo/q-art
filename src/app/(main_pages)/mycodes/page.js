"use client";
// Libraries imports
import { useState, useEffect, useRef } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Box } from "@mui/material";

// App imports
import ImageCard from "./ImagesCard";
import ImageModal from "./ImageModal";
import FilterPanelDesktop from "./FilterPanelDesktop";
import FilterPanelMobile from "./FilterPanelMobile";
import AdminMyCodesMenu from "./AdminMyCodesMenu";
import NoCodesEmptyState from "./NoCodesEmptyState";
import { styles } from "@/_utils/ImageStyles";
import theme from "@/_styles/theme";
import { useStore } from "@/store";
import { getImages } from "@/_utils/ImagesUtils";
import { ROW_UNIT_PX } from "./gridLayout";

export default function MyCodes() {
  /* --------------------------- DECLARE VARIABLES ---------------------------- */
  const router = useRouter();

  // User — reactive read so the page re-renders once StoreInitializer seeds the
  // store on the client (getState() returns the empty server snapshot and never updates).
  const user = useStore((state) => state.user);
  const isAdmin = !!user?.is_admin;
  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  // POC masonry column count — mirrors the xs:1, sm:2, md:2, lg:3, xl:3
  // breakpoints the old MUI Grid used.
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const colCount = isLgUp ? 3 : isSmUp ? 2 : 1;
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(0);
  // Admin-only: defaults to showing only the admin's own codes; never persisted.
  const [myCodesOnly, setMyCodesOnly] = useState(true);

  // Intersection Observer
  const { ref, inView } = useInView({});
  // Guards against firing the same page-load twice — e.g. React Strict Mode's
  // dev-only double-invocation of effects on mount (see explore/page.js's
  // fetchingRef for the same pattern).
  const fetchingRef = useRef(false);
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
    sort: "Newest",
  });

  // Upscaling (loading)
  const [upscaling, setUpscaling] = useState([]);

  //Image Details Modal
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Redirect guests / signed-out users away from their personal gallery. Runs after
  // render (never during) so it can't touch window.location on the server. We key off
  // email + is_guest rather than _id: StoreInitializer briefly seeds the next-auth
  // session user (which has an email but no Mongo _id yet) before the backend user
  // arrives, so a _id check would wrongly bounce a logged-in user on a full page load.
  useEffect(() => {
    const userResolved = user && Object.keys(user).length > 0;
    const isGuestOrSignedOut = !user?.email || user?.is_guest;
    if (userResolved && isGuestOrSignedOut) {
      router.push("/generate");
    }
  }, [user, router]);

  const loadMoreImages = async (params, replace = false) => {
    const newImages = await getImages(params);
    if (replace) {
      setImages(newImages);
    } else {
      setImages((prev) => [...prev, ...newImages]);
    }
    if (newImages.length < 12) {
      setPage(-1);
    } else {
      setPage(params.page);
    }
  };

  // Apply Filter & Sort and load Images
  const applyFilters = (newFilters, myCodesOnlyOverride) => {
    const filtersToUse = newFilters || selectedFilters;
    const myCodesOnlyToUse =
      myCodesOnlyOverride !== undefined ? myCodesOnlyOverride : myCodesOnly;
    setImages([]);
    setPage(0);
    loadMoreImages(
      {
        page: 1,
        user_id: myCodesOnlyToUse ? user._id : undefined,
        exclude_user_id: myCodesOnlyToUse ? undefined : user._id,
        likes: filtersToUse.likes,
        time_period: filtersToUse.time_period,
        image_style: filtersToUse.image_style,
        sort_by: filtersToUse.sort,
      },
      true
    );
  };

  // Admin: flip between "my codes" and "everyone else's codes"
  const handleToggleMyCodesOnly = (newValue) => {
    setMyCodesOnly(newValue);
    applyFilters(selectedFilters, newValue);
  };

  // Infinite scrolling and load Image
  useEffect(() => {
    if (inView && !fetchingRef.current) {
      fetchingRef.current = true;
      const params = {
        page: page + 1,
        user_id: myCodesOnly ? user._id : undefined,
        exclude_user_id: myCodesOnly ? undefined : user._id,
        likes: selectedFilters.likes,
        time_period: selectedFilters.time_period,
        image_style: selectedFilters.image_style,
        sort_by: selectedFilters.sort,
      };
      loadMoreImages(params).finally(() => {
        fetchingRef.current = false;
      });
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

  // remove deleted image from grid
  const customDeleteAction = (imageId) => {
    setImages((prev) => prev.filter((img) => img._id !== imageId));
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
  return images.length === 0 && page === -1 && myCodesOnly ? (
    /* --------------------------- NO USER IMAGES --------------------------- */
    <Box
      sx={{
        position: "relative",
        padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        height: "100vh",
        width: "100%"
      }}
    >
      {isAdmin && !isMobile && (
        <Box
          sx={{
            position: "absolute",
            top: { xs: "4.7rem", sm: "5rem" },
            right: { xs: "0.5rem", sm: "1rem" },
          }}
        >
          <AdminMyCodesMenu
            trigger="icon"
            myCodesOnly={myCodesOnly}
            onToggle={handleToggleMyCodesOnly}
          />
        </Box>
      )}

      {isAdmin && isMobile && (
        <AdminMyCodesMenu
          trigger="fab"
          myCodesOnly={myCodesOnly}
          onToggle={handleToggleMyCodesOnly}
        />
      )}
      <NoCodesEmptyState />
    </Box>
  ) : (
    <Box sx={{ padding: { xs: "4.7rem 0.5rem", sm: "5rem 1rem" } }}>
      {/* ----------------------------- FILTERS ----------------------------- */}
      <Box sx={{ position: "relative" }}>
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

        {isAdmin && !isMobile && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              right: { xs: "0.5rem", sm: "1rem" },
              transform: "translateY(-50%)",
            }}
          >
            <AdminMyCodesMenu
              trigger="icon"
              myCodesOnly={myCodesOnly}
              onToggle={handleToggleMyCodesOnly}
            />
          </Box>
        )}

        {isAdmin && isMobile && (
          <AdminMyCodesMenu
            trigger="fab"
            myCodesOnly={myCodesOnly}
            onToggle={handleToggleMyCodesOnly}
          />
        )}
      </Box>

      {/* --------------------------- IMAGES LIST ------------------------- */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          gridAutoRows: `${ROW_UNIT_PX}px`,
          gridAutoFlow: "row dense",
          alignItems: "start",
          columnGap: { xs: 1, sm: 2, md: 2, lg: 3, xl: 3 },
          rowGap: 0,
          mb: "1.5rem",
        }}
      >
        {images &&
          images.map((image, index) => (
            <ImageCard
              image={image}
              index={index}
              key={index}
              variant="image"
              colCount={colCount}
              handleCardClick={() => handleModalOpen(index)}
              upscaling={upscaling}
              customLikeAction={customLikeAction}
              customDeleteAction={customDeleteAction}
            />
          ))}
      </Box>

      {/* --------------------------- SKELETON CARDS -------------------------- */}
      {page >= 0 && (
        <Box
          ref={ref}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${colCount}, 1fr)`,
            gridAutoRows: `${ROW_UNIT_PX}px`,
            gridAutoFlow: "row dense",
            alignItems: "start",
            columnGap: { xs: 1, sm: 2, md: 2, lg: 3, xl: 3 },
            rowGap: 0,
            mb: "1.5rem",
          }}
        >
          {Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
            <ImageCard item={_} variant="skeleton" index={index} colCount={colCount} key={index} />
          ))}
        </Box>
      )}

      {/* ------------------------ IMAGE DETAILS MODAL ----------------------- */}
      {images != [] && (
        <ImageModal
          open={modalOpen}
          index={selectedImageIndex}
          handleClose={handleModalClose}
          handlePrevious={showPreviousImage}
          handleNext={showNextImage}
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
