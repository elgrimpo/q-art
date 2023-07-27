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
    setValue(newValue)};

  return (
    <div className="app">

        <Toolbar 
        display='flex'>
          <img src={logo} alt="Logo" />
          <Box sx={{display: 'flex', justifyContent: 'space-between', margin: 'auto'}}>
          <Tabs value={value} onChange={handleChange} centered>
        <Tab label="Generate" />
        <Tab label="My codes" />
        <Tab label="Explore" />
      </Tabs>
    </Box>
          <Avatar></Avatar>
        </Toolbar>
<div className='body1'><Generate /></div>
      
    </div>
  );
}

export default App;
