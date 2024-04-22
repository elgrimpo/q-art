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
  const { item, index, handleClick } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { generateFormValues } = useStore();
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  const selected = item.title === generateFormValues.style_title ? true : false;

    // Screen size
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Grid item md={2} key={index}>
      {" "}
      <Card
        elevation={selected ? 0 : 1}
        key={index}
        sx={{
          padding: { xs: "0rem", md: "1.2rem" },
          backgroundColor: selected ? secondaryColor : "white",
          border: selected ? `2px solid ${secondaryColor}` : "none",
          borderRadius: "5px",
        }}
        color={selected ? "secondary" : "primary"}
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
              color: selected ? primaryColor : secondaryColor,
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
          {!isMobile && item.keywords.map((prompt, index) => (
            <Chip
              label={prompt}
              color={selected ? "primary" : "secondary"}
              key={index}
              size="small"
            />
          ))}
        </Stack>
      </Card>
    </Grid>
  );
}

export default StylesCard;
