import React, { useState } from "react";
import {
  Box,
  Button,
  Badge,
  Stack,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Grow,
} from "@mui/material";
import FilterAltTwoToneIcon from "@mui/icons-material/FilterAltTwoTone";
// App imports
import StyledIconButton from "@/_components/StyledIconButton";

/* -------------------------------------------------------------------------- */
/*                                  COMPONENT                                 */
/* -------------------------------------------------------------------------- */

function FilterPanelMobile({
  filters,
  selectedFilters,
  setSelectedFilters,
  applyFilters,
}) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  // Filter Open
  const [filterOpen, setFilterOpen] = useState(false);

  // Initial Filters (in case filter selection is cancelled)
  const [initialFiltersState, setInitialFiltersState] = useState({});

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Open Filter
  const handleFilterOpen = () => {
    setInitialFiltersState({ ...selectedFilters }); // Save the current selectedFilters as initial state in case of cancel
    setFilterOpen(true);
  };

  // Close Filter
  const handleFilterClose = () => {
    setSelectedFilters(initialFiltersState); // Reset selectedFilters to the initial state
    setFilterOpen(false);
  };

  // Select / Deselect Filter Options
  const handleMenuItemClick = (option, filterId) => {
    const newSelectedFilters = { ...selectedFilters };

    if (newSelectedFilters[filterId] === option) {
      newSelectedFilters[filterId] = null;
    } else {
      newSelectedFilters[filterId] = option;
    }
    setSelectedFilters(newSelectedFilters);
  };

  // Get Badge number
  const getBadgeContent = () => {
    let selectedOptionsCount = 0;

    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (key !== "sort" && value !== undefined && value !== "") {
        console.log(key, value);
        selectedOptionsCount++;
      }
    });
    console.log(selectedOptionsCount);
    return selectedOptionsCount || "";
  };

  // Apply Filters
  const handleFiltersApply = () => {
    applyFilters(selectedFilters);
    setFilterOpen(false);
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Box>
      {/* --------------------------- FAB BUTTON ---------------------------- */}
      <Badge
        badgeContent={getBadgeContent()}
        color="secondary"
        variant="circular"
        invisible={!getBadgeContent()}
        overlap="circular"
        sx={{
          position: "fixed",
          bottom: "20px",
          right: "16px",
          zIndex: "100",
          "& .MuiBadge-badge": {
            zIndex: "101",
          },
        }}
      >
        <Fab
          size="large"
          color="primary"
          onClick={handleFilterOpen}
          sx={{ zIndex: "100" }}
        >
          <FilterAltTwoToneIcon />
        </Fab>
      </Badge>

      {/* ------------------------------- DIALOG ------------------------------- */}
      <Dialog
        anchor="bottom"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullScreen
        sx={{ overflow: "hidden",
        "& .MuiDialog-paper": { 
          maxHeight:"100%",
          maxWidth: "100%",
        }
      }}
        TransitionComponent={Grow}
      >
        <DialogTitle>
          <Typography variant="h5" align="center">
            Filters
          </Typography>
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
              handleClick={handleFilterClose}
            />
          </Box>
        </DialogTitle>

        {/* -------------------------- FILTER SECTIONS ------------------------- */}

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: { xs: "top", md: "center" },
            overflow: "scroll",
          }}
        >
          {filters.map((filter, index) => (
            <Box sx={{ padding: "1rem" }} key={index}>
              <Typography
                variant="h6"
                key={index}
                align="center"
                sx={{ mb: "1rem" }}
              >
                {filter.name}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                useFlexGap
                flexWrap="wrap"
              >
                {/* ------------------------ FILTER OPTIONS ------------------------ */}
                {filter.options.map((option, optionIndex) => (
                  <Chip
                    key={optionIndex}
                    color="primary"
                    label={option}
                    size="medium"
                    variant={
                      selectedFilters[filter.id] === option
                        ? "filled"
                        : "outlined"
                    }
                    onClick={() => handleMenuItemClick(option, filter.id)}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </DialogContent>

        {/* ------------------------------- APPLY BUTTON ---------------------------- */}
        <DialogActions>
          <Button
            variant="contained"
            sx={{ width: "100%", margin: "1rem" }}
            onClick={handleFiltersApply}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FilterPanelMobile;
