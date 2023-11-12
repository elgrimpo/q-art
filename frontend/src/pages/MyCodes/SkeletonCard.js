//Libraries imports
import React from "react";
import {
  Stack,
  Skeleton,
} from "@mui/material";


function SkeletonCard(props) {
  const { index } = props;



  return (
    <div>
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

      <Stack
        direction="row"
        justifyContent="center"
        alignItems="center"
        spacing={3}
        sx={{ mt: "1.5rem" }}
        key={index + "_2"}
      >
        <Skeleton
          variant="circular"
          width={30}
          height={30}
          key={index + "_3"}
        />
        <Skeleton
          variant="circular"
          width={30}
          height={30}
          key={index + "_4"}
        />
        <Skeleton
          variant="circular"
          width={30}
          height={30}
          key={index + "_5"}
        />
        <Skeleton
          variant="circular"
          width={30}
          height={30}
          key={index + "_6"}
        />
      </Stack>
    </div>
  );
}

export default SkeletonCard;
