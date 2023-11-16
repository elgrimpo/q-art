import React, { useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  MenuList,
  Badge,
  Stack,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import SortTwoToneIcon from "@mui/icons-material/SortTwoTone";
import ExpandMoreTwoToneIcon from "@mui/icons-material/ExpandMoreTwoTone";
import FavoriteTwoToneIcon from "@mui/icons-material/FavoriteTwoTone";
import CalendarMonthTwoToneIcon from "@mui/icons-material/CalendarMonthTwoTone";
import ColorLensTwoToneIcon from "@mui/icons-material/ColorLensTwoTone";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "../../styles/mui-theme";
import FilterAltTwoToneIcon from "@mui/icons-material/FilterAltTwoTone";
import CloseIcon from "@mui/icons-material/Close";

function FilterPanel({ filters, filtersSet, setFiltersSet, applyFilters }) {
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // State to manage anchor elements and open states for each filter
  const [initialFiltersState, setInitialFiltersState] = useState({});
  const [filterAnchorEl, setFilterAnchorEl] = useState(
    Array(filters.length).fill(null)
  );
  const [filterOpen, setFilterOpen] = useState(
    Array(filters.length).fill(false)
  );

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  
  const handleMobileFilterOpen = () => {
    setInitialFiltersState({ ...filtersSet }); // Save the current filtersSet as initial state
    setMobileFilterOpen(true);
  };
  // Function to handle clicking on a filter button to open the menu
  const handleFilterClick = (event, index) => {
    const newAnchorEl = [...filterAnchorEl];
    const newOpen = [...filterOpen];

    // Set the anchor element and open state for the clicked filter
    newAnchorEl[index] = event.currentTarget;
    newOpen[index] = true;

    setFilterAnchorEl(newAnchorEl);
    setFilterOpen(newOpen);
  };

  // Function to reset the filters to the initial state
  const handleMobileFilterClose = () => {
    setFiltersSet(initialFiltersState); // Reset filtersSet to the initial state
    setMobileFilterOpen(false);
  };

  // Function to close the menu for a specific filter
  const handleFilterClose = (index) => {
    const newOpen = [...filterOpen];
    newOpen[index] = false;

    setFilterOpen(newOpen);
  };

  // Function to handle selecting a filter option from the menu
  const handleMenuItemClick = (filterIndex, option, filterId) => {
    const newFiltersSet = { ...filtersSet };

    if (newFiltersSet[filterId] === option) {
      newFiltersSet[filterId] = null;
    } else {
      newFiltersSet[filterId] = option;
    }
    setFiltersSet(newFiltersSet);

    if (!isMobile) {
      handleFilterClose(filterIndex);
      applyFilters(newFiltersSet);
    }
  };

  const handleMobileApplyFilters = () => {
    applyFilters(filtersSet);
    setMobileFilterOpen(false);
  };

  const getMenuItems = (options, filterIndex, filterId) => {
    return options.map((option, optionIndex) => {
      const selectedOption = filtersSet[filterId];
      return isMobile ? (
        <Chip
          color="primary"
          label={option}
          size="medium"
          variant={selectedOption === option ? "filled" : "outlined"}
          onClick={() => handleMenuItemClick(filterIndex, option, filterId)}
        />
      ) : (
        <MenuItem
          key={optionIndex}
          selected={selectedOption === option}
          onClick={() => handleMenuItemClick(filterIndex, option, filterId)}
        >
          {option}
        </MenuItem>
      );
    });
  };

  const getBadgeContent = (filterId) => {
    return filtersSet[filterId] || "";
  };

  const getMobileBadgeContent = () => {
    let selectedOptionsCount = 0;
  
    // Iterate through filtersSet to count selected options
    Object.values(filtersSet).forEach((value) => {
      if (value !== null && value !== "") {
        selectedOptionsCount++;
      }
    });
  
    return selectedOptionsCount || "";
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "60px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mb: "1rem",
        borderRadius: "6px",
      }}
    >
      {isMobile ? (
        // ANCHOR: MOBILE VIEW
        <div>
          <Badge
            badgeContent={getMobileBadgeContent()}
            color="secondary"
            variant="circular"
            invisible={!getMobileBadgeContent()}
          >
            <Button
              size="large"
              variant="contained"
              // sx={{ margin: "0.5rem" }}
              // onClick={(event) => handleFilterClick(event, index)}
              startIcon={<FilterAltTwoToneIcon />}
              onClick={handleMobileFilterOpen}
            >
              Filter
            </Button>
          </Badge>
          <Dialog
            anchor="bottom"
            open={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            fullScreen

            // onOpen={toggleDrawer(anchor, true)}
          >
            <DialogTitle>
              <Typography variant="h5" align="center">
                Filters
              </Typography>
              <IconButton
                sx={{ position: "absolute", top: "0.8rem", right: "1rem" }}
                onClick={handleMobileFilterClose}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {filters.map((filter, index) => (
                <Box sx={{ padding: "1rem" }}>
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
                    {getMenuItems(filter.options, index, filter.id)}
                  </Stack>
                </Box>
              ))}
            </DialogContent>

            <DialogActions>
              <Button
                variant="contained"
                sx={{ width: "100%", margin: "1rem" }}
                onClick={handleMobileApplyFilters}
              >
                Apply Filters
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      ) : (
        // ANCHOR: DESKTOP VIEW
        <Stack direction="row" spacing={2}>
          {filters.map((filter, index) => (
            <div key={index}>
              {/* Button for each filter with a badge */}

              {/* ---------- Menu Button ---------- */}
              <Badge
                badgeContent="1"
                color="secondary"
                variant="circular"
                invisible={!getBadgeContent(filter.id)}
              >
                <Button
                  id={`filter-button-${index}`}
                  size="large"
                  variant="contained"
                  // sx={{ margin: "0.5rem" }}
                  onClick={(event) => handleFilterClick(event, index)}
                  endIcon={<ExpandMoreTwoToneIcon />}
                  startIcon={
                    filter.name === "Likes" ? (
                      <FavoriteTwoToneIcon />
                    ) : filter.name === "Time Period" ? (
                      <CalendarMonthTwoToneIcon />
                    ) : filter.name === "SD Model" ? (
                      <ColorLensTwoToneIcon />
                    ) : (
                      <SortTwoToneIcon />
                    )
                  }
                >
                  {filter.name}
                </Button>
              </Badge>

              {/*------- Menu for each filter --------*/}
              <Menu
                id={`basic-menu-${index}`}
                anchorEl={filterAnchorEl[index]}
                open={filterOpen[index]}
                onClose={() => handleFilterClose(index)}
              >
                <MenuList sx={{ minWidth: "200px" }}>
                  {/* Render menu items for the filter */}
                  {getMenuItems(filter.options, index, filter.id)}
                </MenuList>
              </Menu>
            </div>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default FilterPanel;
