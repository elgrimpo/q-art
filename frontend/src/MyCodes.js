import {
  Card,
  CardMedia,
  CircularProgress,
  Box,
  Grid,
  Typography,
  Paper,
  Backdrop,
  Stack,
  IconButton,
  Skeleton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ShareTwoToneIcon from "@mui/icons-material/ShareTwoTone";
import "./App.css";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import base64ToBlob from "b64-to-blob";
import DownloadTwoToneIcon from "@mui/icons-material/DownloadTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import ChevronRightTwoToneIcon from "@mui/icons-material/KeyboardArrowRightTwoTone";
import ChevronLeftTwoToneIcon from "@mui/icons-material/ChevronLeftTwoTone";
import dayjs from "dayjs";

function MyCodes() {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  const getImages = () => {
    axios
      .get(`http://localhost:8000/images/get/`)
      .then((res) => {
        setImages(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        console.log(err);
      });
  };

  useEffect(() => {
    getImages();
  }, []);

  // --------- Infinite scroll -----------
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef(null);

  const getMoreImages = () => {
    setIsLoading(true);
    axios
      .get(`http://localhost:8000/images/get/?page=${page + 1}`)
      .then((res) => {
        if (res.data.length === 0) {
          setIsLoading(false);
          setPage(-1);
        } else {
          setImages((prevImages) => [...prevImages, ...res.data]);
          setIsLoading(false);
          setPage((prevPage) => prevPage + 1);
        }
      })
      .catch((err) => {
        setIsLoading(false);
        console.log(err);
      });
  };

  useEffect(() => {
    
    const options = {
        root: null,
        rootMargin: "5px",
        threshold: 1, // Adjust this threshold value as needed
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            getMoreImages()
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
    
  }, [isLoading, images]);

  // -------- Actions ----------
  const downloadImage = (image) => {
    const blob = base64ToBlob(image);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my_qr_art.png";
    link.click();
  };

  const deleteImage = (id) => {
    axios
      .delete(`http://localhost:8000/images/delete/${id}`)
      .then(() => {
        getImages();
      })
      .catch((err) => {
        console.log(err);
      });
  };


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
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="stretch"
      columns={8}
      spacing={3}
      sx={{mb:'1.5rem'}}
    >
      {/*------ Images List ------*/}

      <>
        {images && images.map((item, index) => (
          <Grid item md={2} key={index}>
            {" "}
            {/* Add key prop */}
            <Card
              elevation={0}
              key={index}
              sx={{
                padding: "1.2rem",
                backgroundColor: primaryColor,
                borderRadius: "5px",
              }}
              color="primary"
            >
              <CardMedia
                component="img"
                image={`data:image/png;base64,${item?.image_str}`}
                sx={{ borderRadius: "5px" }}
                onClick={() => handleModalOpen(index)}
              />

              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={3}
                sx={{ mt: "1rem" }}
              >
                <IconButton onClick={() => downloadImage(item.image_str)}>
                  <DownloadTwoToneIcon />
                </IconButton>
                <IconButton>
                  <ShareTwoToneIcon/>
                </IconButton>
                <IconButton onClick={() => deleteImage(item._id)}>
                  <DeleteForeverTwoToneIcon />
                </IconButton>
              </Stack>
            </Card>
          </Grid>
        ))}
      </>
</Grid>
{!isLoading && page > 0 && <div ref={loadMoreRef}></div>}
<Grid container
      direction="row"
      justifyContent="center"
      alignItems="stretch"
      columns={8}
      spacing={3}>
      <>
        {page > 0 &&
          Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
            <Grid item md={2} key={`skeleton-${index}`}>
              <Card
                elevation={0}
                sx={{
                  padding: "1.2rem",
                  backgroundColor: primaryColor,
                  borderRadius: "5px",
                }}
                color="primary"
              >
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height="0px"
                  animation="wave"
                  sx={{
                    aspectRatio: "1/1",
                    paddingTop: "100%", // Set the height to be the same as the width
                  }}
                />

                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  spacing={3}
                  sx={{ mt: "1rem" }}
                >
                  <Skeleton variant="circular" width={30} height={30} />

                  <Skeleton variant="circular" width={30} height={30} />

                  <Skeleton variant="circular" width={30} height={30} />
                </Stack>
              </Card>
            </Grid>
          ))}
      </>
      </Grid>

      {/*----------------- Modal: Image Details----------------*/}

      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={handleModalClose}
      >
        <IconButton
          sx={{
            borderRadius: "20px",
            backgroundColor: "#70E195",
            margin: "1rem",
          }}
          onClick={showPreviousImage}
        >
          <ChevronLeftTwoToneIcon />
        </IconButton>
        <Paper
          elevation={10}
          sx={{
            width: "80%",
            height: "80%",
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "row",
            borderRadius: "16px",
          }}
        >
          <div
            style={{
              height: "100%",
              aspectRatio: "1/1",
              backgroundColor: "#70E195",
              display: "flex",
              borderRadius: "16px 0px 0px 16px",
            }}
          >
            <img
              src={`data:image/png;base64,${images[selectedImageIndex]?.image_str}`}
              style={{
                height: "90%",
                objectFit: "contain",
                margin: "auto",
                borderRadius: "16px",
              }}
            />
          </div>
          <Stack
            sx={{ height: "100%", padding: "2rem" }}
            justifyContent="center"
            alignItems="flex-start"
          >
            <Typography variant="subtitle2">Date created</Typography>
            <Typography variant="body" sx={{ mb: "1rem" }}>
              {images[selectedImageIndex]?.created_at != "-"
                ? dayjs(images[selectedImageIndex]?.created_at).format(
                    "MMMM D, YYYY"
                  )
                : "-"}
            </Typography>
            <Typography variant="subtitle2">QR Content</Typography>
            <Typography variant="body" sx={{ mb: "1rem" }}>
              {images[selectedImageIndex]?.content}
            </Typography>
            <Typography variant="subtitle2">Prompt</Typography>
            <Typography variant="body" sx={{ mb: "1rem" }}>
              {images[selectedImageIndex]?.prompt}
            </Typography>
            <Typography variant="subtitle2">Seed</Typography>
            <Typography variant="body" sx={{ mb: "1rem" }}>
              {images[selectedImageIndex]?.seed}
            </Typography>
          </Stack>
        </Paper>
        <IconButton
          sx={{
            borderRadius: "20px",
            backgroundColor: "#70E195",
            margin: "1rem",
          }}
          onClick={showNextImage}
        >
          <ChevronRightTwoToneIcon />
        </IconButton>
      </Backdrop>

      {/* Trigger for loading more images */}
      
    
    </div>
  );
}

export default MyCodes;
