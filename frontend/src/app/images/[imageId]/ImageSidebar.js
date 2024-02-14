// Libraries imports
import React from "react";
import { List, ListItemText, Typography, Box, Stack } from "@mui/material";
import dayjs from "dayjs";

//App imports
import DeleteButton from "@/_components/actions/DeleteButton";
import CopyButton from "@/_components/actions/CopyButton";
import LikeButton from "@/_components/actions/LikeButton";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function ImageSidebar(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  // TODO: Put in
  const isMobile = false;
  // const { handleClose } = props;
  const { image, user, customDeleteAction, customLikeAction } = props;
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
        minWidth: "230px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: { md: "scroll" },
      }}
    >
      {/* -------------------------------- METADATA -------------------------------- */}
      <div style={{ maxHeight: "100%" }}>
        {/* ------------------------------ ICON BUTTONS ------------------------------ */}
        <Stack
          direction="row"
          justifyContent={{ xs: "center", md: "left" }}
          alignItems="center"
          spacing={3}
          sx={{ mb: "1rem" }}
        >
          <LikeButton
            image={image}
            user={user}
            customLikeAction={customLikeAction}
          />
          <DeleteButton image={image} customDeleteAction={customDeleteAction} />

          <CopyButton image={image} />
        </Stack>
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
            primary="Stable Diffusion Model"
            secondary={image?.sd_model}
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
