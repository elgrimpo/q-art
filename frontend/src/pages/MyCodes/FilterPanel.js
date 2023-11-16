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


function FilterPanel({ filters, filtersSet, setFiltersSet, applyFilters }) {
  
  // State to manage anchor elements and open states for each filter
  const [filterAnchorEl, setFilterAnchorEl] = useState(
    Array(filters.length).fill(null)
  );
  const [filterOpen, setFilterOpen] = useState(
    Array(filters.length).fill(false)
  );



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

  // Function to close the menu for a specific filter
  const handleFilterClose = (index) => {
    const newOpen = [...filterOpen];
    newOpen[index] = false;

    setFilterOpen(newOpen);
  };

  // Function to handle selecting a filter option from the menu
  const handleMenuItemClick = (
    filterIndex,
    option,
    filterId
  ) => {
    const newFiltersSet = { ...filtersSet };

    if (newFiltersSet[filterId] === option) {
      newFiltersSet[filterId] = null
    } else {
      newFiltersSet[filterId] = option;
    }

    setFiltersSet(newFiltersSet);
    handleFilterClose(filterIndex);
    applyFilters(newFiltersSet)
  };

  const getMenuItems = (options, filterIndex, filterId) => {
    return options.map((option, optionIndex) => {
      const selectedOption = filtersSet[filterId];
      return (
        <MenuItem
          key={optionIndex}
          selected={selectedOption === option}
          onClick={() =>
            handleMenuItemClick(filterIndex, option, filterId)
          }
        >
          {option}
        </MenuItem>
      );
    });
  };

  // Function to get badge content for a filter based on selected option
  const getBadgeContent = (filterId) => {
    return filtersSet[filterId] || "";
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
      <Stack direction="row" spacing={2}>
        {filters.map((filter, index) => (
          <div key={index}>
            {/* Button for each filter with a badge */}

            {/* ---------- Menu Button ---------- */}
            <Badge
              badgeContent={getBadgeContent(filter.id)}
              color="secondary"
              variant="dot"
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
    </Box>
  );
}

export default FilterPanel;
