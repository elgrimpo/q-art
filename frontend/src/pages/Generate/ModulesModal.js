// Libraries imports
import {
  Dialog,
  DialogContent,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useEffect } from "react";
import Masonry from "@mui/lab/Masonry";

// App imports
import { ActionTypes } from "../../context/reducers";
import { useImages, useImagesDispatch } from "../../context/AppProvider";
import SdModelCard from "./ModulesCard";
// TODO: Rename ModulesModal
function SdModelsModal(props) {
  const { open, handleClose, handleModelSelection } = props;

  const dispatch = useImagesDispatch();
  const { sd_models } = useImages();

  // ----- Get Images ------ //
  const getSdModels = async () => {
    dispatch({ type: ActionTypes.SET_LOADING_SD_MODELS, payload: true });

    await axios
      .get("http://localhost:8000/models/get")
      .then((res) => {
        dispatch({
          type: ActionTypes.SET_SD_MODELS,
          payload: res.data,
        });

        dispatch({
          type: ActionTypes.SET_LOADING_SD_MODELS,
          payload: false,
        });
      })
      .catch((err) => {
        dispatch({
          type: ActionTypes.SET_LOADING_SD_MODELS,
          payload: false,
        });
        console.log(err);
      });
  };

  useEffect(() => {
    getSdModels()
  }, []);

  return (
    <Dialog maxWidth="xl" open={open} onClose={handleClose}>
      <DialogContent>
        <Typography variant="h5" align="center" style={{ margin: "1rem 0" }}>
          Stable Diffusion Models
        </Typography>
        <Masonry
          direction="row"
          columns={3}
          spacing={3}
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
            : Array.from({ length: 12 }, (_, index) => index).map(
                (_, index) => (
                  <SdModelCard item={_} variant="skeleton" index={index} key={index}/>
                )
              )}
        </Masonry>
      </DialogContent>
    </Dialog>
  );
}

export default SdModelsModal;
