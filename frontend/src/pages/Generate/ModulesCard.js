//Libraries imports
import { useTheme } from "@mui/material/styles";
import {
  Card,
  CardMedia,
  Grid,
  Typography,
  Skeleton,
  Chip
} from "@mui/material";

// App imports



function ModuleCard(props) {
  const { variant, item, index, onClick } = props;
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;


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
        {variant == "skeleton" ? (
          <Skeleton
            variant="rounded"
            width="100%"
            height="0px"
            animation="wave"
            sx={{
              aspectRatio: "1/1",
              paddingTop: "100%", // Set the height to be the same as the width
            }}
            key={index + "_1"}
          />
        ) : (
          <CardMedia
            component="img"
            image={`data:image/png;base64,${item?.image_str}`}
            sx={{ borderRadius: "5px" }}
            onClick={onClick}
            key={index}
          />
        )}
      <Typography display="block"
        style={{ wordWrap: "break-word" }}
        >Lorem_isum_dolor_si_amet_ecetera_ecetera</Typography>
        <Chip label="Chip Filled" />
      </Card>
    </Grid>
  );
}

export default ModuleCard;
