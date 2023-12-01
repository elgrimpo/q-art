// Libraries imports
import { Dialog, DialogContent, Typography, Box } from "@mui/material";
import { useEffect, useState } from "react";
import Masonry from "@mui/lab/Masonry";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";

// App imports
import { useImages, useImagesDispatch } from "../../context/AppProvider";
import SdModelCard from "./SdModelsCard";
import { useGenerateUtils } from "../../utils/GenerateUtils";
import StyledIconButton from "../../components/StyledIconButton";
import NegPromptCard from "./NegPromptCard";
import { negativePrompts } from "../../utils/NegativePrompts";
import PromptKeywords from "./PromptKeywords";
import { promptKeywords } from "../../utils/PromptGenerator";
import { ActionTypes } from "../../context/reducers";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function GenerateModal(props) {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Props
  const { open, handleClose, handleModelSelection, variant } = props;

  // Context
  const { sd_models, generateFormValues } = useImages();
  const dispatch = useImagesDispatch()
  // Utils
  const { getSdModels } = useGenerateUtils();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Prompt keywords
    const [selectedKeywords, setSelectedKeywords] = useState(
    generateFormValues.prompt.split(", ")
  );
  /* -------------------------------- FUNCTIONS ------------------------------- */

  useEffect(() => {
    setSelectedKeywords(generateFormValues.prompt.split(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateFormValues.prompt]);
  useEffect(() => {
    getSdModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTitle = () => {
    if (variant === "sd_model") {
      return "Stable Diffusion Model";
    } else if (variant === "negative_prompt") {
      return "Negative Prompt Templates";
    } else if (variant === "prompt_keywords") {
      return "Select keywords";
    }
  };

  const handleKeywordSelection = (keyword) => {
    let updatedKeywords = [...selectedKeywords];


    if (updatedKeywords.includes(keyword)) {
      updatedKeywords = updatedKeywords.filter((key) => key !== keyword);
    } else {
      if (!updatedKeywords.length || updatedKeywords[0] === '') {
        updatedKeywords = [keyword];
      } else {
        updatedKeywords.push(keyword);
      }
    }

    setSelectedKeywords(updatedKeywords);

    const updatedPrompt = updatedKeywords.join(', ');

    dispatch({
      type: ActionTypes.SET_GENERATE_FORM_VALUES,
      payload: {
        ...generateFormValues,
        prompt: updatedPrompt,
      },
    });
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Dialog
      fullScreen={isMobile}
      maxWidth="xl"
      open={open}
      onClose={handleClose}
    >
      <Box
        sx={{
          margin: { sx: "0rem", lg: "1rem" },
          position: "absolute",
          top: { xs: "0.5rem" },
          right: { xs: "0.5rem" },
          zIndex: "1",
        }}
      >
        <StyledIconButton
          variant="contained"
          color="secondary"
          type="close"
          handleClick={handleClose}
        />
      </Box>
      <DialogContent sx={{ padding: { xs: "0px", sm: "1rem" } }} align="center">
        {/* TITLE */}
        <Typography variant="h5" align="center" style={{ margin: "1rem 0" }}>
          {getTitle()}
        </Typography>

        {/* GRID */}
        <Masonry
          direction="row"
          columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
          spacing={{ xs: 2, sm: 2, md: 2, lg: 3, xl: 3 }}
          sx={{ mb: "1.5rem" }}
        >
          {/* -------------------------------- SD MODELS ------------------------------- */}
          {variant === "sd_model"
            ? sd_models.length > 0
              ? sd_models.map((item, index) => (
                  <SdModelCard
                    item={item}
                    index={index}
                    key={index}
                    handleModelSelection={handleModelSelection}
                    variant="image"
                  />
                ))
              : // SKELETON CARDS FOR LOADING IMAGES
                Array.from({ length: 12 }, (_, index) => index).map(
                  (_, index) => (
                    <SdModelCard
                      item={_}
                      variant="skeleton"
                      index={index}
                      key={index}
                    />
                  )
                )
            : /* ------------------------ NEGATIVE PROMPT TEMPLATES ----------------------- */
            variant === "negative_prompt"
            ? negativePrompts.map((item, index) => (
                <NegPromptCard
                  item={item}
                  index={index}
                  key={index}
                  handleClose={handleClose}
                />
              ))
            : /* ----------------------------- PROMPT KEYWORDS ---------------------------- */
              promptKeywords.map((item, index) => (
                <PromptKeywords
                  item={item}
                  index={index}
                  key={index}
                  handleClose={handleClose}
                  selectedKeywords={selectedKeywords}
                  handleKeywordSelection={handleKeywordSelection}
                />
              ))}
        </Masonry>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateModal;
