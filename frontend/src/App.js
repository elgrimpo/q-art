// Libraries imports
import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import TabContext from "@mui/lab/TabContext";
import TabPanel from "@mui/lab/TabPanel";
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

  // Change Tabs
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Login
  const handleLogin = async () => {
    window.open("http://localhost:8000/login/google", "_self");
  };

  // Check if user session exists
  useEffect(() => {
    getUserInfo();
  }, [generatedImage, userImages]);

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <ThemeProvider theme={theme}>
      <TabContext value={tabValue}>
        <div className="app">
          {/*-------- App Bar --------*/}

          {/* ------------------------------ APP BAR ----------------------------- */}
          <Toolbar display="flex" className="header">
            {/* LOGO */}
            <img src={logo} alt="Logo" />

            {/* TABS */}
            <Box className="menu-container">
              <Tabs
                sx={{ display: { xs: "none", md: "flex" } }}
                value={tabValue}
                onChange={handleTabChange}
                centered
              >
                <Tab label="Generate" value="Generate" />
                <Tab label="My codes" value="My codes" />
                <Tab label="Explore" value="Explore" />
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
            {/* GENERATE PAGE */}
            <TabPanel value="Generate">
              <Generate />
            </TabPanel>

            {/* MY CODES PAGE */}
            <TabPanel value="My codes">
              <ImageGallery imageType="userImages" setTabValue={setTabValue} />
            </TabPanel>

            {/* EXPLORE PAGE */}
            <TabPanel value="Explore">
              <ImageGallery
                imageType="communityImages"
                setTabValue={setTabValue}
              />
            </TabPanel>
          </div>

          {/* ---------------------------- SNACKBAR ------------------------ */}
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
                value="Generate"
                label="Generate"
                icon={<AutoFixHighTwoToneIcon />}
              />

              {/* MY CODES PAGE */}
              <BottomNavigationAction
                value="My codes"
                label="My codes"
                icon={<ImageTwoToneIcon />}
              />

              {/* EXPLORE PAGE */}
              <BottomNavigationAction
                value="Explore"
                label="Explore"
                icon={<Diversity1TwoToneIcon />}
              />
            </BottomNavigation>
          )}
        </div>
      </TabContext>
    </ThemeProvider>
  );
}

export default App;
