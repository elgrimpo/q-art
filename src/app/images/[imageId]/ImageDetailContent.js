"use client";

import React from "react";
import { Box } from "@mui/material";

import ImageFill from "./ImageFill";
import ImageSidebar from "./ImageSidebar";
import ImageTopBar from "./ImageTopBar";

/**
 * Shared image-detail layout used by the standalone page and both modals
 * (mycodes gallery + generate intercept). Keeps their design identical:
 *  - overlay top bar on the image (circular back + action buttons)
 *  - image 60% / sidebar 40% on md+, stacked (sidebar below image) below md
 *  - image goes full-bleed on phone (xs)
 *
 * Parents must apply horizontal padding of `2` (16px) on xs for the
 * full-bleed negative margin to line up.
 */
export default function ImageDetailContent({
  image,
  user,
  onBack,
  onPrev,
  onNext,
  customDeleteAction,
  customLikeAction,
  fitHeight = false,
  imageBoxProps = {},
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 3, md: 5 },
        alignItems: "flex-start",
        width: "100%",
      }}
    >
      {/* IMAGE */}
      <Box
        {...imageBoxProps}
        sx={{
          // full-bleed on phone: width grows by 2× the parent's xs padding (2 = 16px)
          // and the negative margins pull it edge-to-edge symmetrically.
          // In modals (fitHeight) the square is also capped to the visible modal
          // height (100vh − 40px paper margin − 48px body padding, plus an 8px
          // buffer for rounding) so it never forces a scroll, keeping the
          // padding even on all sides.
          width: {
            xs: "calc(100% + 32px)",
            md: fitHeight ? "min(60%, calc(100vh - 96px))" : "60%",
          },
          flexShrink: 0,
          mx: { xs: -2, md: 0 },
        }}
      >
        <ImageFill
          image={image}
          onPrev={onPrev}
          onNext={onNext}
          topOverlay={
            <ImageTopBar
              image={image}
              user={user}
              onBack={onBack}
              customDeleteAction={customDeleteAction}
              customLikeAction={customLikeAction}
              backVariant="icon"
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 2,
                p: 1.5,
              }}
            />
          }
        />
      </Box>

      {/* SIDEBAR */}
      <Box
        sx={{
          width: { xs: "100%", md: "auto" },
          flex: { md: 1 },
          minWidth: 0,
          overflowY: { md: fitHeight ? "auto" : "visible" },
          maxHeight: { md: fitHeight ? "calc(100vh - 96px)" : "none" },
        }}
      >
        <ImageSidebar
          image={image}
          user={user}
          customDeleteAction={customDeleteAction}
          customLikeAction={customLikeAction}
          showActions={false}
        />
      </Box>
    </Box>
  );
}
