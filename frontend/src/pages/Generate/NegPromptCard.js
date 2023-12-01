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
import { ActionTypes } from "../../context/reducers";
import { useImages, useImagesDispatch } from "../../context/AppProvider";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function NegPromptCard(props) {
  const { item, index, handleClose } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { generateFormValues } = useImages();
  const dispatch = useImagesDispatch();

  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Append keywords to the existing negative_prompt
  function appendKeywords(existingPrompt, keywords) {
  
    // Split the existing prompt into an array of words
    const promptArray = existingPrompt.split(', ');
  
    // Concatenate the existing words with the keywords array
    const updatedPromptArray = [...promptArray, ...keywords];
  
    // Remove duplicates and return the updated prompt as a string
    return updatedPromptArray.filter(Boolean).join(', ');
  }

  // Update generateFormValues
  function updateNegativePrompt() {
    const updatedNegativePrompt = appendKeywords(
      generateFormValues.negative_prompt,
      item.keywords
    );

    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: {
        ...generateFormValues,
        negative_prompt: updatedNegativePrompt,
      },
    });
    handleClose();
  }

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

        {/*  IMAGE */}
        <CardActionArea onClick={() => updateNegativePrompt()}>
          <CardMedia
            component="img"
            image={item.image_url}
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
            {item?.title}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            justifyContent="center"
          >
            {item.keywords.map((prompt, index) => (
              <Chip label={prompt} color="secondary" key={index} size="small" />
            ))}
          </Stack>
        </CardActionArea>
      </Card>
    </Grid>
  );
}

export default NegPromptCard;
