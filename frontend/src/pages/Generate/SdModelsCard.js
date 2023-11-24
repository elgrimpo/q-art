//Libraries imports
import { useTheme } from "@mui/material/styles";
import {
  Card,
  CardMedia,
  Grid,
  Typography,
  Skeleton,
  CardActionArea,
} from "@mui/material";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function SdModelCard(props) {
  const { variant, item, index, handleModelSelection } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

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
          padding: "1.2rem",
          backgroundColor: primaryColor,
          borderRadius: "5px",
        }}
        color="primary"
      >
        {/* ----------------------------- IMAGE --------------------------- */}
        {variant === "skeleton" ? (
          // SKELETON FOR LOADING THE IMAGE
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
        ) : (
          // IMAGE
          <CardActionArea onClick={() => handleModelSelection(item.sd_name)}>
            <CardMedia
              component="img"
              image={
                item.qr_image_url ? item.qr_image_url : item.civitai_image_url
              }
              sx={{ borderRadius: "5px", aspectRatio: "1/1" }}
              key={index}
            />

            {/* ---------------------------------- TEXT ---------------------------------- */}
            <Typography
              variant="h5"
              align="center"
              display="block"
              style={{ wordWrap: "break-word", margin: "1rem 0" }}
            >
              {item?.name}
            </Typography>
          </CardActionArea>
        )}
      </Card>
    </Grid>
  );
}

export default SdModelCard;
