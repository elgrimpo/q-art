// Libraries imports
import { Dialog, DialogContent, Typography } from "@mui/material";
import { useEffect } from "react";
import Masonry from "@mui/lab/Masonry";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";

// App imports
import { useImages } from "../../context/AppProvider";
import SdModelCard from "./SdModelsCard";
import { useGenerateUtils } from "../../utils/GenerateUtils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function SdModelsModal(props) {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Props
  const { open, handleClose, handleModelSelection } = props;

  // Context
  const { sd_models } = useImages();

  // Utils
  const { getSdModels } = useGenerateUtils();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  /* -------------------------------- FUNCTIONS ------------------------------- */

  useEffect(() => {
    getSdModels();
  }, []);

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
      <DialogContent sx={{ padding: { xs: "0px", sm: "1rem" } }} align="center">
        {/* TITLE */}
        <Typography variant="h5" align="center" style={{ margin: "1rem 0" }}>
          Stable Diffusion Models
        </Typography>

        {/* GRID */}
        <Masonry
          direction="row"
          columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
          spacing={{ xs: 2, sm: 2, md: 2, lg: 3, xl: 3 }}
          sx={{ mb: "1.5rem" }}
        >
          {sd_models.length > 0
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
              )}
        </Masonry>
      </DialogContent>
    </Dialog>
  );
}

export default SdModelsModal;
