// Libraries imports
import * as React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import {
  Tab,
  Tabs,
  Toolbar,
  Box,
  Button,
  Snackbar,
  Alert,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
} from "@mui/material";
import AutoFixHighTwoToneIcon from "@mui/icons-material/AutoFixHighTwoTone";
import ImageTwoToneIcon from "@mui/icons-material/ImageTwoTone";
import Diversity1TwoToneIcon from "@mui/icons-material/Diversity1TwoTone";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import theme from "./styles/mui-theme";

// App imports
import { useImages } from "./context/AppProvider";
import "./styles/App.css";
import Generate from "./pages/Generate/Generate";
import logo from "./assets/logo.png";
import AccountMenu from "./pages/Home/AccountMenu";
import ImageGallery from "./pages/MyCodes/ImageGallery";
import { useUtils } from "./utils/utils";
import Account from "./pages/Home/Account";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

function App() {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Context
  const {
    user,
    alertOpen,
    alertSeverity,
    alertMessage,
    generatedImage,
    userImages,
  } = useImages();

  // Utils functions
  const { getUserInfo, logout, closeAlert } = useUtils();

  // Screen size
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Current Tab
  const [tabValue, setTabValue] = React.useState("Generate");

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Login
  const handleLogin = async () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/login/google`, "_self");
  }
  // Check if user session exists
  useEffect(() => {
    getUserInfo();
  }, [generatedImage, userImages, getUserInfo]);

  // Change selected Tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        {/*-------- App Bar --------*/}

        {/* ------------------------------ APP BAR ----------------------------- */}
        <Toolbar display="flex" className="header">
          {/* LOGO */}
          <img src={logo} alt="Logo" />

          {/* TABS */}
          <Box className="menu-container">
            <Tabs
              value={tabValue}
              sx={{ display: { xs: "none", md: "flex" } }}
              onChange={handleTabChange}
              centered
            >
              <Tab
                component={Link}
                label="Generate"
                value="Generate"
                to="/generate"
              />
              <Tab
                component={Link}
                label="My codes"
                value="My codes"
                to="/mycodes"
              />
              <Tab
                component={Link}
                label="Explore"
                value="Explore"
                to="/explore"
              />
            </Tabs>
          </Box>

          {/* ACCOUNT */}
          {user._id ? (
            <AccountMenu handleLogout={logout} />
          ) : (
            <Button onClick={handleLogin}>Login</Button>
          )}
        </Toolbar>

        {/* --------------------------- APP CONTENT -------------------------- */}

        <div className="body">
          <Routes>
            {/* GENERATE PAGE */}
            <Route path="/" element={<Navigate to="/generate" replace />} />

            <Route path="generate" element={<Generate />} />

            {/* MY CODES PAGE */}
            <Route
              path="mycodes"
              element={
                <ImageGallery
                  imageType="userImages"
                  setTabValue={setTabValue}
                />
              }
            />

            {/* EXPLORE PAGE */}
            <Route
              path="explore"
              element={
                <ImageGallery
                  imageType="communityImages"
                  setTabValue={setTabValue}
                />
              }
            />

            {/* ACCOUNT */}
            <Route path="account" element={<Account />} />
          </Routes>
        </div>

        {/* ---------------------------- SNACKBAR -------------------------- */}
        <Snackbar
          open={alertOpen}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          autoHideDuration={6000}
          onClose={closeAlert}
        >
          <Alert
            severity={alertSeverity}
            sx={{ width: "100%" }}
            variant="filled"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={closeAlert}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {alertMessage}
          </Alert>
        </Snackbar>

        {/* ----------------------- BOTTOM NAVIGATION ------------------- */}
        {isMobile && (
          <BottomNavigation
            showLabels
            value={tabValue}
            onChange={(event, newValue) => {
              setTabValue(newValue);
            }}
          >
            {/* GENERATE PAGE */}
            <BottomNavigationAction
              component={Link}
              value="Generate"
              label="Generate"
              to="/generate"
              icon={<AutoFixHighTwoToneIcon />}
            />

            {/* MY CODES PAGE */}
            <BottomNavigationAction
              component={Link}
              value="My codes"
              label="My codes"
              to="/mycodes"
              icon={<ImageTwoToneIcon />}
            />

            {/* EXPLORE PAGE */}
            <BottomNavigationAction
              component={Link}
              value="Explore"
              label="Explore"
              to="/explore"
              icon={<Diversity1TwoToneIcon />}
            />
          </BottomNavigation>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
