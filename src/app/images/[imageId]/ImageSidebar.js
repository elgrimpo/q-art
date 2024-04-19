"use client";
// Libraries imports
import React from "react";
import { List, ListItemText, Typography, Box, Stack } from "@mui/material";
import dayjs from "dayjs";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "@/_styles/theme";

//App imports
import DeleteButton from "@/_components/actions/DeleteButton";
import CopyButton from "@/_components/actions/CopyButton";
import LikeButton from "@/_components/actions/LikeButton";
import DownloadButton from "@/_components/actions/DownloadButton";
import ShareButton from "@/_components/actions/ShareButton";
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function ImageSidebar(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  // const { handleClose } = props;
  const { image, user, customDeleteAction, customLikeAction } = props;

  const { processingImages } = useStore();
  const isOwner = user?._id === image?.user_id;

  const isImageProcessing = processingImages.includes(image?._id);
  /* -------------------------------- FUNCTIONS ------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Box
      sx={{
        flex: "1",
        // height: "100%",
        padding: "3rem",
        minWidth: "300px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflowY: { md: "scroll" },
        overflowX: "clip",
      }}
    >
      {/* -------------------------------- METADATA -------------------------------- */}
      <div style={{ maxHeight: "100%" }}>
        {/* ------------------------------ ICON BUTTONS ------------------------------ */}
        {/* TODO: Disable buttons instead of hide */}
        {!isImageProcessing && (
          <Stack
            direction="row"
            justifyContent={{ xs: "center", md: "left" }}
            alignItems="center"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
            sx={{ mb: "1rem" }}
          >
            <LikeButton
              image={image}
              user={user}
              customLikeAction={customLikeAction}
            />

            <ShareButton image={image} index={1} />

            {isOwner && (
              <DeleteButton
                image={image}
                customDeleteAction={customDeleteAction}
              />
            )}
            {user?._id && <CopyButton image={image} />}

            {isOwner && <DownloadButton image={image} user={user} />}
          </Stack>
        )}
        <Typography variant="h5" align={isMobile ? "center" : "left"}>
          Image Details
        </Typography>
        <List>
          <ListItemText
            primary="Date created"
            secondary={dayjs(image?.created_at).format("MMMM D, YYYY")}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="QR Content"
            secondary={image?.content}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Prompt"
            secondary={image?.prompt}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Style"
            secondary={image?.style_title}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Seed"
            secondary={image?.seed}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Image Dimensions"
            secondary={`${image?.width} x ${image?.height} px`}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="QR Code Weight"
            secondary={image?.qr_weight}
            align={isMobile ? "center" : "left"}
          />
          <ListItemText
            primary="Image Id"
            secondary={image?._id}
            align={isMobile ? "center" : "left"}
          />
        </List>
      </div>
    </Box>
  );
}
