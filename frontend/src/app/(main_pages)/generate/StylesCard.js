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
          padding: { xs: "0rem 0rem 1rem 0rem", md: "1.2rem" },
          backgroundColor: selected ? secondaryColor : primaryColor,
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
            sx={{ borderRadius: "5px", aspectRatio: "1/1" }}
            key={index}
          />

          {/* ---------------------------------- TEXT ---------------------------------- */}
          <Typography
            variant="h5"
            align="center"
            display="block"
            style={{
              wordWrap: "break-word",
              margin: "1rem 0",
              color: selected ? primaryColor : secondaryColor,
            }}
          >
            {item?.title}
          </Typography>
          {/* TODO: Find workaround for HTML Nesting issue */}
          {/* <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            justifyContent="center"
          >
            {item.keywords.map((prompt, index) => (
              <Chip
                label={prompt}
                color={selected ? "primary" : "secondary"}
                key={index}
                size="small"
              />
            ))}
          </Stack> */}
        </CardActionArea>
      </Card>
    </Grid>
  );
}

export default StylesCard;
