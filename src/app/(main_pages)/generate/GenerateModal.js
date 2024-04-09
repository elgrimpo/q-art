"use client";
// Libraries imports
import { Dialog, DialogContent, Typography, Box, Grow } from "@mui/material";
import React, { useEffect, useState } from "react";
// import Masonry from "@mui/lab/Masonry";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "@/_styles/theme";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

// App imports
import StyledIconButton from "@/_components/StyledIconButton";
import PromptKeywords from "./PromptKeywords";
import { promptKeywords } from "@/_utils/PromptGenerator";
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function GenerateModal(props) {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Props
  const { open, handleClose, customStyle, setCustomStyle } = props;

  // Context
  const { generateFormValues, setGenerateFormValues } = useStore();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Prompt keywords
  const [selectedKeywords, setSelectedKeywords] = useState(
    customStyle.prompt.split(", ")
  );

  const [promptKeywordss, setPromptKeywords] = useState(promptKeywords);
  /* -------------------------------- FUNCTIONS ------------------------------- */

  useEffect(() => {
    setSelectedKeywords(customStyle.prompt.split(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customStyle.prompt]);

  useEffect(() => {
    setPromptKeywords(promptKeywords);
  }, [promptKeywords]);

  const handleKeywordSelection = (keyword) => {
    let updatedKeywords = [...selectedKeywords];

    if (updatedKeywords?.includes(keyword)) {
      updatedKeywords = updatedKeywords?.filter((key) => key !== keyword);
    } else {
      if (!updatedKeywords.length || updatedKeywords[0] === "") {
        updatedKeywords = [keyword];
      } else {
        updatedKeywords.push(keyword);
      }
    }

    setSelectedKeywords(updatedKeywords);

    const updatedPrompt = updatedKeywords.join(", ");
    setCustomStyle({
      ...customStyle,
      prompt: updatedPrompt,
      keywords: updatedKeywords,
    });
    setGenerateFormValues({
      ...generateFormValues,
      style_id: customStyle.id,
      style_title: customStyle.title,
      style_prompt: updatedPrompt,
      sd_model: customStyle.sd_model,
    });
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Dialog
      fullScreen={isMobile}
      TransitionComponent={Grow}

      open={open}
      onClose={handleClose}
      fullWidth
      sx={{
        ...(isMobile && {
          "& .MuiDialog-paper": { 
            maxHeight: "100%",
            maxWidth: "100%" 
          }})
      }}
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
      <DialogContent
        sx={{ padding: { xs: "0.5rem", sm: "1rem" } }}
        align="center"
      >
        {/* TITLE */}
        <Typography variant="h5" align="center" style={{ margin: "1rem 0" }}>
          Select keywords
        </Typography>

        {/* GRID */}
        <ResponsiveMasonry
          style={{ width: "100%" }}
          columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}
        >
          <Masonry gutter="1rem">
            {/* ----------------------------- PROMPT KEYWORDS
            ---------------------------- */}
            {promptKeywordss?.map((item, index) => (
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
        </ResponsiveMasonry>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateModal;
