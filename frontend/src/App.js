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
import ImageTwoToneIcon from '@mui/icons-material/ImageTwoTone';
import Diversity1TwoToneIcon from '@mui/icons-material/Diversity1TwoTone';
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

function App() {
  const [value, setValue] = React.useState("Generate");
  const { user, alertOpen, alertSeverity, alertMessage, generatedImage } = useImages();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  const { getUserInfo, logout, closeAlert } = useUtils();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));;
  // Login
  const handleLogin = async () => {
    window.open("http://localhost:8000/login/google", "_self");
  };

  // Check if user session exists
  useEffect(() => {
    getUserInfo();
  }, [generatedImage]);

  return (
    <ThemeProvider theme={theme}>
      <TabContext value={value}>
        <div className="app">
          {/*-------- App Bar --------*/}
          <Toolbar display="flex" className="header">
            <img src={logo} alt="Logo" />
            <Box className="menu-container">
              <Tabs sx={{ display: { xs: 'none', md: 'flex' }}} value={value} onChange={handleChange} centered>
                <Tab label="Generate" value="Generate" />
                <Tab label="My codes" value="My codes" />
                <Tab label="Explore" value="Explore" />
              </Tabs>
            </Box>
            {user._id ? (
              <AccountMenu handleLogout={logout} />
            ) : (
              <Button onClick={handleLogin}>Login</Button>
            )}
          </Toolbar>

          {/*-------- App Body --------*/}
          <div className="body">
            <TabPanel value="Generate">
              <Generate />
            </TabPanel>

            <TabPanel value="My codes">
              <ImageGallery imageType="userImages" setTabValue={setValue} />
            </TabPanel>
            <TabPanel value="Explore">
              <ImageGallery
                imageType="communityImages"
                setTabValue={setValue}
              />
            </TabPanel>
          </div>

          {/* ---- Snackbar ---- */}
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

          { isMobile &&
          <BottomNavigation
            showLabels
            value={value}
            onChange={(event, newValue) => {
              setValue(newValue);
            }}
          >
            <BottomNavigationAction
              value="Generate"
              label="Generate"
              icon={<AutoFixHighTwoToneIcon />}
            />
            <BottomNavigationAction
              value="My codes"
              label="My codes"
              icon={<ImageTwoToneIcon />}
            />
            <BottomNavigationAction
              value="Explore"
              label="Explore"
              icon={<Diversity1TwoToneIcon />}
            />
          </BottomNavigation>}
        </div>
      </TabContext>
    </ThemeProvider>
  );
}

export default App;
