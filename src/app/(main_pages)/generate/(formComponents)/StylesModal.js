"use client";
// Libraries imports
import React, { useEffect, useState } from "react";
import { Box, Typography, Dialog, Grow } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import theme from "@/_styles/theme";

// App imports
import "../../../globals.css";
import { styles } from "@/_utils/ImageStyles";
import StylesCard from "./StylesCard";
import { useStore } from "@/store";
import StyledIconButton from "@/_components/StyledIconButton";

const StylesModal = (props) => {
  // Props
  const { open, handleClose } = props;

  const { generateFormValues, setGenerateFormValues } = useStore();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Select Style
  const handleStyleClick = (item) => {
    setGenerateFormValues({
      ...generateFormValues,
      style_id: item.id,
      style_prompt: item.prompt,
      style_title: item.title,
      sd_model: item.sd_model,
      loras: item.loras ?? [],
    });

    setTimeout(() => {
      handleClose();
    }, 300);  };

  return (
    <Dialog
      fullScreen={isMobile}
      TransitionComponent={Grow}
      open={open}
      onClose={handleClose}
      fullWidth
      sx={{
        ...(isMobile && {
          "& .MuiDialog-paper": {
            maxHeight: "100%",
            maxWidth: "100%",
          },
        }),
      }}
    >
      <Box
        sx={{ padding: "1rem", backgroundColor: theme.palette.primary.light }}
      >
        <Box
        sx={{
          margin: { sx: "0rem", lg: "1rem" },
          position: "absolute",
          top: { xs: "0.5rem" },
          right: { xs: "0.5rem" },
          zIndex: "1",
        }}
      >
        <StyledIconButton
          variant="contained"
          color="secondary"
          type="close"
          handleClick={handleClose}
        />
      </Box>
        <Typography
          className="form-title"
          variant="h3"
          align="center"
          sx={{ margin: "0.5rem" }}
        >
          Select Image Style
        </Typography>
        <ResponsiveMasonry
          style={{
            width: "100%",
            // backgroundColor: "#A5FFC3",
            padding: isMobile ? "0.5rem" : "1rem",
            overflow: "visible",
          }}
          columnsCountBreakPoints={{
            350: 2,
            1000: 3,
            // 1200: 4
          }}
        >
          <Masonry gutter="1rem" style={{ overflow: "visible" }}>
            
            {styles.map((item, index) => (
              <StylesCard
                item={item}
                index={index}
                key={index}
                handleClick={handleStyleClick}
              />
            ))}
          </Masonry>
        </ResponsiveMasonry>
      </Box>
    </Dialog>
  );
};

export default StylesModal;
