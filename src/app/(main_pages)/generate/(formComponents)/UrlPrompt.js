import {
  Box,
  Typography,
  TextField,
  Stack,
  InputAdornment,
  Tooltip,
  IconButton,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import EditIcon from "@mui/icons-material/Edit";
import { useStore } from "@/store";
import CasinoTwoToneIcon from "@mui/icons-material/CasinoTwoTone";
import promptRandomizer from "@/_utils/PromptGenerator";

const SectionLabel = ({ icon: Icon, label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
    <Icon sx={{ fontSize: "1rem" }} color="primary" />
    <Typography variant="h6">{label}</Typography>
  </Box>
);

const UrlPrompt = ({ handleInputChange }) => {
  const { generateFormValues } = useStore();

  return (
    <Stack useFlexGap spacing={2}>

      {/* URL */}
      <Box className="form-section" sx={{ marginTop: "0rem" }}>
        <SectionLabel icon={LinkIcon} label="Website URL" />
        <TextField
          className="form-field"
          required
          id="website"
          placeholder="https://example.com"
          name="website"
          value={generateFormValues.website}
          onChange={handleInputChange}
          variant="outlined"
          inputProps={{ 'aria-label': 'Website' }}
        />
      </Box>

      {/* Prompt */}
      <Box className="form-section">
        <SectionLabel icon={EditIcon} label="Image Description" />
        <TextField
          className="form-field"
          required
          id="prompt"
          placeholder="Describe the image you want to generate..."
          name="prompt"
          value={generateFormValues.prompt}
          onChange={handleInputChange}
          variant="outlined"
          multiline
          rows={3}
          inputProps={{ 'aria-label': 'Prompt' }}
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
                  <Tooltip title="Generate random prompt">
                    <IconButton
                      name="prompt_random"
                      onClick={() =>
                        handleInputChange({
                          target: { name: "prompt", value: promptRandomizer() },
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
      </Box>

    </Stack>
  );
};

export default UrlPrompt;
