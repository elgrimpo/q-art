"use client";
import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Chip,
  Slider,
  Stack,
  InputAdornment,
  Tooltip,
  IconButton,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import EditIcon from "@mui/icons-material/Edit";
import StyleIcon from "@mui/icons-material/Style";
import TuneIcon from "@mui/icons-material/Tune";
import CasinoTwoToneIcon from "@mui/icons-material/CasinoTwoTone";

import promptRandomizer from "@/_utils/PromptGenerator";
import { styles } from "@/_utils/ImageStyles";
import { QR_SLIDER_MIN, QR_SLIDER_MAX } from "@/_utils/qrWeight";
import StylesModal from "./StylesModal";

const FEATURED_STYLES = styles.slice(0, 6);

const SLIDER_IMAGES = {
  '-2': '/slider-images/Weight_minus_2.png',
  '-1': '/slider-images/Weight_minus_1.png',
  '0':  '/slider-images/Weight_0.png',
  '1':  '/slider-images/Weight_plus_1.png',
  '2':  '/slider-images/Weight_plus_2.png',
};

const SectionLabel = ({ icon: Icon, label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
    <Icon sx={{ fontSize: "1rem" }} color="primary" />
    <Typography variant="h6">{label}</Typography>
  </Box>
);

export default function GenerationFormFields({
  values,
  onFieldChange,
  onStyleChange,
  onQrWeightChange,
  showQrWeight = false,
  urlDisabled = false,
}) {
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [showWeightPreview, setShowWeightPreview] = useState(false);

  const featuredIds = new Set(FEATURED_STYLES.map((s) => s.id));
  const overflowStyle =
    !featuredIds.has(values.style_id)
      ? styles.find((s) => s.id === values.style_id && s.title === values.style_title)
      : null;

  return (
    <Stack spacing={2}>
      {/* URL */}
      <Box>
        <SectionLabel icon={LinkIcon} label="Website URL" />
        <TextField
          required
          fullWidth
          id="website"
          name="website"
          placeholder="https://example.com"
          value={values.website}
          onChange={onFieldChange}
          disabled={urlDisabled}
          variant="outlined"
          inputProps={{ "aria-label": "Website" }}
        />
      </Box>

      {/* Prompt */}
      <Box>
        <SectionLabel icon={EditIcon} label="Image Description" />
        <TextField
          required
          fullWidth
          id="prompt"
          name="prompt"
          placeholder="Describe the image you want to generate..."
          value={values.prompt}
          onChange={onFieldChange}
          variant="outlined"
          multiline
          rows={3}
          inputProps={{ "aria-label": "Prompt" }}
          InputProps={{
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{ alignItems: "center", alignSelf: "flex-start", padding: "0.9rem 0rem" }}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Tooltip title="Generate random prompt">
                    <IconButton
                      onClick={() =>
                        onFieldChange({ target: { name: "prompt", value: promptRandomizer() } })
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

      {/* Style chips */}
      <Box>
        <SectionLabel icon={StyleIcon} label="Style" />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {FEATURED_STYLES.map((style) => (
            <Chip
              key={style.id + style.title}
              label={style.title}
              variant={values.style_id === style.id ? "filled" : "outlined"}
              color="primary"
              onClick={() => onStyleChange(style)}
            />
          ))}
          {overflowStyle && (
            <Chip
              key={overflowStyle.id + overflowStyle.title}
              label={overflowStyle.title}
              variant="filled"
              color="primary"
            />
          )}
          <Chip
            label="+"
            variant="outlined"
            color="primary"
            onClick={() => setStyleModalOpen(true)}
          />
        </Box>
      </Box>

      {/* QR Weight — only when showQrWeight */}
      {showQrWeight && (
        <Box sx={{ px: 1, position: 'relative' }}>
          {showWeightPreview && (
            <Box sx={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', pb: 1, zIndex: 10 }}>
              <Box
                component="img"
                src={SLIDER_IMAGES[String(Math.round(values.qr_weight))]}
                alt={`Brightness weight ${values.qr_weight}`}
                sx={{ width: 250, height: 250, borderRadius: 2, objectFit: 'cover', display: 'block' }}
              />
            </Box>
          )}
          <SectionLabel icon={TuneIcon} label="QR Code Weight" />
          <Box onPointerDown={() => setShowWeightPreview(true)}>
            <Slider
              min={QR_SLIDER_MIN}
              max={QR_SLIDER_MAX}
              step={1}
              value={values.qr_weight}
              onChange={(_, val) => onQrWeightChange(val)}
              onChangeCommitted={() => setShowWeightPreview(false)}
              marks={[
                { value: QR_SLIDER_MIN, label: 'Artistic' },
                { value: QR_SLIDER_MAX, label: 'Scannable' },
              ]}
              sx={{ '& .MuiSlider-markLabel': { color: 'text.muted' } }}
            />
          </Box>
        </Box>
      )}

      <StylesModal
        open={styleModalOpen}
        handleClose={() => setStyleModalOpen(false)}
        onStyleSelect={onStyleChange}
      />
    </Stack>
  );
}
