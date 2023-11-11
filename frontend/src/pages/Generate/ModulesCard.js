//Libraries imports
import { useTheme } from "@mui/material/styles";
import {
  Card,
  CardMedia,
  Grid,
  Typography,
  Skeleton,
  Chip,
  Stack,
  CardActionArea,
} from "@mui/material";

// App imports

function SdModelCard(props) {
  const { variant, item, index, handleModelSelection } = props;
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
          <CardActionArea
            onClick={() => handleModelSelection(item.sd_name_in_api)}
          >
            <CardMedia
              component="img"
              image={item?.cover_url}
              sx={{ borderRadius: "5px", aspectRatio: "1/1" }}
              key={index}
            />

            <Typography
              variant="h5"
              align="center"
              display="block"
              style={{ wordWrap: "break-word", margin: "1rem 0" }}
            >
              {item?.sd_name}
            </Typography>
            {/* <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {item?.tags.map((tag, index) => (
                <Chip key={index} label={tag} />
              ))}
            </Stack> */}
          </CardActionArea>
        )}
      </Card>
    </Grid>
  );
}

export default SdModelCard;
