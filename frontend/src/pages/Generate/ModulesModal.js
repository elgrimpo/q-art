// Libraries imports
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid
} from "@mui/material";

//App imports
import ModuleCard from './ModulesCard';

function ModulesModal(props) {
  const {open, handleClose}= props;
  const modules = []

  return (
      <Dialog
        fullWidth='false'
        maxWidth='lg'
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>Stable Diffusion Models</DialogTitle>
        <DialogContent>

          <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        columns={6}
        spacing={3}
        sx={{ mb: "1.5rem" }}
      >
        {modules.length > 0 ? 
          (modules.map((item, index) => (
            <ModuleCard
              item={item}
              index={index}
              variant="image"
            />
          ))) : (Array.from({ length: 12 }, (_, index) => index).map((_, index) => (
            <ModuleCard item={_} variant="skeleton" index={index} />
          )))
        }
      </Grid>
        </DialogContent>
      </Dialog>

  );
}

export default ModulesModal;
