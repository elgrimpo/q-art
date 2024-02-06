'use client'
//Libraries imports
import { useTheme } from "@mui/material/styles";
import { Card, Grid, Typography, Stack, Chip } from "@mui/material";

// App imports


/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function PromptKeywords(props) {
  const { item, index, selectedKeywords, handleKeywordSelection } = props;

  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Check if a keyword is selected
  const isSelected = (keyword) => {
    return selectedKeywords.includes(keyword);
  };

  // Function to handle keyword selection/deselection

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
          {item.keywords.map((keyword, index) => (
            <Chip
              label={keyword}
              variant={isSelected(keyword) ? "contained" : "outlined"}
              color="secondary"
              key={index}
              onClick={() => handleKeywordSelection(keyword)}
            />
          ))}
        </Stack>
      </Card>
    </Grid>
  );
}

export default PromptKeywords;
