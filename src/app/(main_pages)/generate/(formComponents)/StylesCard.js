"use client";

//Libraries imports
import { useTheme } from "@mui/material/styles";
import {
  Card,
  CardMedia,
  Grid,
  Typography,
  CardActionArea,
  Stack,
  Chip,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

// App imports
import { useStore } from "@/store";
/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function StylesCard(props) {
  const { item, index, handleClick, selectedTitle } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { generateFormValues } = useStore();
  const theme = useTheme();

  const selected = item.title === (selectedTitle ?? generateFormValues.style_title);

    // Screen size
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Grid item md={2} key={index}>
      {" "}
      <Card
        elevation={0}
        key={index}
        sx={{
          padding: { xs: "0rem", md: "1rem" },
          bgcolor: selected ? "rgba(112, 225, 149, 0.08)" : "background.well",
          border: "2px solid",
          borderColor: selected ? "primary.main" : "divider",
          borderRadius: "8px",
        }}
      >
        {/* ----------------------------- IMAGE --------------------------- */}

        {/*  IMAGE */}
        <CardActionArea onClick={() => handleClick(item)}>
          <CardMedia
            component="img"
            image={item?.image_url}
            sx={{ borderRadius: {xs: "0px", md: "5px"}, aspectRatio: "1/1" }}
            key={index}
          />

          {/* ---------------------------------- TEXT ---------------------------------- */}
          <Typography
            variant= {isMobile ? "subtitle1" : "h5"}
            align="center"
            display="block"
            sx={{
              wordWrap: "break-word",
              margin: {xs: "0.3rem 0rem", md: "1rem 0rem"},
              color: selected ? "primary.main" : "text.secondary",
            }}
          >
            {item?.title}
          </Typography>
        </CardActionArea>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          justifyContent="center"
        >
        </Stack>
      </Card>
    </Grid>
  );
}

export default StylesCard;
