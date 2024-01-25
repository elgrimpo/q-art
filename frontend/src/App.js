// Libraries imports
import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import {
  Container,
  AppBar,
  Toolbar,
  Box,
  Button,
  Snackbar,
  Alert,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect } from "react";
import theme from "./styles/mui-theme";

// App imports
import { useImages } from "./context/AppProvider";
import "./styles/App.css";
import Generate from "./pages/Generate/Generate";
import logo from "./assets/logo.png";
import AccountMenu from "./pages/Home/AccountMenu";
import ImageGallery from "./pages/ImageGallery/ImageGallery";
import { useUtils } from "./utils/utils";
import Account from "./pages/UserAccount/AccountPage";
import NavBar from "./pages/Home/NavBar";
import ImagePage from "./pages/ImageGallery/ImagePage";

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

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Login
  const handleLogin = async () => {
    window.open(
      `${process.env.REACT_APP_BACKEND_URL}/api/login/google`,
      "_self"
    );
  };
  // Check if user session exists
  useEffect(() => {
    getUserInfo();
  }, [generatedImage, userImages, getUserInfo]);

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <ThemeProvider theme={theme}>
      <div>
        {/* ------------------------------- NAVIGATION ------------------------------- */}

        <NavBar />

        {/* ------------------------------ APP BAR ----------------------------- */}
        <AppBar
          sx={{ backgroundColor: "white", boxShadow: "none", zIndex: 500 }}
        >
          <Container
            maxWidth="xl"
            sx={{ padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 } }}
          >
            <Toolbar display="flex" className="header">
              {/* LOGO */}
              <img src={logo} alt="Logo" />
              <Box sx={{ flexGrow: 1 }}></Box>

              {/* ACCOUNT */}
              {user._id ? (
                <AccountMenu handleLogout={logout} />
              ) : (
                <Button onClick={handleLogin}>Login</Button>
              )}
            </Toolbar>
          </Container>
        </AppBar>

        {/* --------------------------- APP CONTENT -------------------------- */}

        <div className="body">
          <Container
            maxWidth="xl"
            sx={{ padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 } }}
          >
            <Routes>
              {/* GENERATE PAGE */}
              <Route path="/" element={<Navigate to="/generate/" replace />} />

              <Route path="generate" element={<Generate />} />

              {/* MY CODES PAGE */}
              <Route
                path="mycodes"
                element={
                  <ImageGallery
                    imageType="userImages"
                    handleLogin={handleLogin}
                  />
                }
              />

              {/* EXPLORE PAGE */}
              <Route
                path="explore"
                element={<ImageGallery imageType="communityImages" />}
              />

              {/* IMAGE PAGE */}
              <Route path="images/:id"
              element={<ImagePage />}/>
            
              {/* ACCOUNT */}
              <Route path="account" element={<Account />} />
            </Routes>
          </Container>
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
      </div>
    </ThemeProvider>
  );
}

export default App;
