// Libraries
import React, { useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  MenuList,
  Badge,
  Stack,
} from "@mui/material";
import SortTwoToneIcon from "@mui/icons-material/SortTwoTone";
import ExpandMoreTwoToneIcon from "@mui/icons-material/ExpandMoreTwoTone";
import FavoriteTwoToneIcon from "@mui/icons-material/FavoriteTwoTone";
import CalendarMonthTwoToneIcon from "@mui/icons-material/CalendarMonthTwoTone";
import ColorLensTwoToneIcon from "@mui/icons-material/ColorLensTwoTone";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function FilterPanelDesktop({
  filters,
  selectedFilters,
  setSelectedFilters,
  applyFilters,
}) {
  /* --------------------------- DECLARE VARIABLES -------------------------- */

  // Anchor elements for individual filter dropdowns
  const [filterAnchorEl, setFilterAnchorEl] = useState(
    Array(filters.length).fill(null)
  );

  // Open state for individual filter menus
  const [filterOpen, setFilterOpen] = useState(
    Array(filters.length).fill(false)
  );

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Mandle clicking on a filter button to open the menu
  const handleFilterClick = (event, index) => {
    const newAnchorEl = [...filterAnchorEl];
    const newOpen = [...filterOpen];

    newAnchorEl[index] = event.currentTarget;
    newOpen[index] = true;

    setFilterAnchorEl(newAnchorEl);
    setFilterOpen(newOpen);
  };

  // Close the menu for a specific filter
  const handleFilterClose = (index) => {
    const newOpen = [...filterOpen];
    newOpen[index] = false;

    setFilterOpen(newOpen);
  };

  // Handle selecting a filter option from the menu
  const handleMenuItemClick = (filterIndex, option, filterId) => {
    const newSelectedFilters = { ...selectedFilters };

    if (newSelectedFilters[filterId] === option) {
      newSelectedFilters[filterId] = null;
    } else {
      newSelectedFilters[filterId] = option;
    }
    setSelectedFilters(newSelectedFilters);

    handleFilterClose(filterIndex);
    applyFilters(newSelectedFilters);
  };

  // Handle display of Badges for each filter
  const getBadgeContent = (filterId) => {
    if (filterId !== "sort") {
      return selectedFilters[filterId] || "";
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */

  return (
    <Box>
      <Stack
        direction="row-reverse"
        spacing={2}
        justifyContent="center"
        sx={{ mb: "1rem" }}
      >
        {filters.map((filter, index) => (
          <div key={index}>
            {/* ------------------ MENU BUTTONS ------------------------------ */}

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
                  ) : filter.name === "Style" ? (
                    <ColorLensTwoToneIcon />
                  ) : (
                    <SortTwoToneIcon />
                  )
                }
              >
                {filter.name}
              </Button>
            </Badge>

            {/* ------------------ FILTER MENUS ------------------------------ */}

            <Menu
              id={`basic-menu-${index}`}
              anchorEl={filterAnchorEl[index]}
              open={filterOpen[index]}
              onClose={() => handleFilterClose(index)}
            >
              <MenuList sx={{ minWidth: "200px" }}>
                {/* -------------- MENU OPTIONS ----------------------------- */}

                {filter.options.map((option, optionIndex) => (
                  <MenuItem
                    key={optionIndex}
                    selected={selectedFilters[filter.id] === option}
                    onClick={() =>
                      handleMenuItemClick(index, option, filter.id)
                    }
                  >
                    {option}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </div>
        ))}
      </Stack>
    </Box>
  );
}

export default FilterPanelDesktop;
