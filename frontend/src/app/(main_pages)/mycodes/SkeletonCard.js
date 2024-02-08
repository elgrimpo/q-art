//Libraries imports
import React from "react";
import { Stack, Skeleton } from "@mui/material";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function SkeletonCard(props) {
  const { index } = props;

  return (
    <div>
      {/* ------------------------ IMAGE SKELETON ------------------------- */}
      <Skeleton
        variant="rounded"
        width="100%"
        height="0px"
        animation="wave"
        sx={{
          aspectRatio: "1/1",
          paddingTop: "100%",
        }}
        key={index + "_1"}
      />

      {/* ------------------------- ICONS SKELETON ------------------------- */}

      <Stack
        direction="row"
        justifyContent="center"
        alignItems="center"
        spacing={3}
        sx={{ mt: "1.6rem" }}
        key={index + "_2"}
      >
        {Array.from({ length: 4 }, (_, index) => index).map((_, iconIndex) => (
          <Skeleton variant="circular" width={30} height={30} key={iconIndex} />
        ))}
      </Stack>
    </div>
  );
}

export default SkeletonCard;
