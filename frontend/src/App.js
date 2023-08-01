import {
  Avatar,
  AppBar,
  Button,
  Card,
  CardMedia,
  Container,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import "./App.css";
import axios from "axios";
import { useState } from "react";
import placeholderImage from "./placeholder_image.png";
import Generate from "./Generate";
import logo from "./logo.png";
import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./mui-theme";

const pages = ["Products", "Pricing", "Blog"];
const settings = ["Profile", "Account", "Dashboard", "Logout"];

function App() {
  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <Toolbar display="flex" className='header'>
          <img src={logo} alt="Logo" />
          <Box className="menu-container">
            <Tabs value={value} onChange={handleChange} centered>
              <Tab label="Generate" />
              <Tab label="My codes" />
              <Tab label="Explore" />
            </Tabs>
          </Box>
          <Avatar></Avatar>
        </Toolbar>
        <div className="body" style={{}}>
          <Generate />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
