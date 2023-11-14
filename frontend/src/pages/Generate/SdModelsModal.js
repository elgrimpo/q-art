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

function SdModelsModal(props) {
  const { open, handleClose, handleModelSelection } = props;

  const { sd_models } = useImages();
  const { getSdModels } = useGenerateUtils();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    getSdModels();
  }, []);

  return (
    <Dialog fullScreen={isMobile} maxWidth="xl" open={open} onClose={handleClose}>
      <DialogContent sx={{padding: {xs: "0px", sm: "1rem"}}} align="center">
        <Typography variant="h5" align="center" style={{ margin: "1rem 0" }}>
          Stable Diffusion Models
        </Typography>
        <Masonry  direction="row" columns={{xs:1, sm:2, md: 2, lg: 3, xl:3}} spacing={{xs:2, sm:2, md:2, lg:3, xl:3}} sx={{ mb: "1.5rem" }} >
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
            : Array.from({ length: 12 }, (_, index) => index).map(
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
