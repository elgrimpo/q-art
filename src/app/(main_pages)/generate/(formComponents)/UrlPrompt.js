import {
  Box,
  Typography,
  TextField,
  Stack,
  InputAdornment,
  Tooltip,
  IconButton,
} from "@mui/material";
import { useStore } from "@/store";
import CasinoTwoToneIcon from "@mui/icons-material/CasinoTwoTone";
import promptRandomizer from "@/_utils/PromptGenerator";

const UrlPrompt = (props) => {
  const { generateFormValues } = useStore();
  const { handleInputChange } = props;

  return (
    <Stack useFlexGap spacing={1}>

      {/* ----------------------------------- URL ---------------------------------- */}
      <Box className="form-section" sx={{ marginTop: "0rem" }}>
        <Typography className="form-title" variant="h5" align="left">
          Website URL
        </Typography>
        <TextField
          className="form-field"
          required
          id="website"
          label="Website"
          name="website"
          value={generateFormValues.website}
          onChange={handleInputChange}
          variant="outlined"
        />
        <Typography className="helpertext">
          e.g. 'google.com'. The generated image will contain a QR code that
          links to this URL.
        </Typography>
      </Box>

      {/* --------------------------------- PROMPT --------------------------------- */}
      <Box className="form-section">
        <Typography className="form-title" variant="h5" align="left">
          Image Description
        </Typography>

        <TextField
          className="form-field"
          required
          id="prompt"
          label="Prompt"
          name="prompt"
          value={generateFormValues.prompt}
          onChange={handleInputChange}
          variant="outlined"
          multiline
          rows={3}
          InputProps={{
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{
                  alignItems: "center",
                  alignSelf: "flex-start",
                  padding: "0.9rem 0rem",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  
                  {/* --- RANDOM PROMPT ---- */}
                  <Tooltip title="Generate random prompt">
                    <IconButton
                      name="prompt_random"
                      onClick={() =>
                        handleInputChange({
                          target: {
                            name: "prompt",
                            value: promptRandomizer(),
                          },
                        })
                      }
                    >
                      <CasinoTwoToneIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </InputAdornment>
            ),
          }}
        />
        <Typography className="helpertext">
          Describe the image that you would like to be created. Use the Dice icon to generate a random description.
        </Typography>
      </Box>

    </Stack>
  );
};

export default UrlPrompt;
