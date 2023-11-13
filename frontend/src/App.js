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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect } from "react";

// App imports
import { useImages } from "./context/AppProvider";
import "./styles/App.css";
import theme from "./styles/mui-theme";
import Generate from "./pages/Generate/Generate";
import logo from "./assets/logo.png";
import AccountMenu from "./pages/Home/AccountMenu";
import ImageGallery from "./pages/MyCodes/ImageGallery";
import { useUtils } from "./utils/utils";

function App() {
  const [value, setValue] = React.useState("1");
  const { user, alertOpen, alertSeverity, alertMessage } = useImages();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  const { getUserInfo, logout, closeAlert } = useUtils();

  // Login
  const handleLogin = async () => {
    window.open("http://localhost:8000/login/google", "_self");
  };

  // Check if user session exists
  useEffect(() => {
    getUserInfo();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <TabContext value={value}>
        <div className="app">
          {/*-------- App Bar --------*/}
          <Toolbar display="flex" className="header">
            <img src={logo} alt="Logo" />
            <Box className="menu-container">
              <Tabs value={value} onChange={handleChange} centered>
                <Tab label="Generate" value="1" />
                <Tab label="My codes" value="2" />
                <Tab label="Explore" value="3" />
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
            <TabPanel value="1">
              <Generate />
            </TabPanel>

            <TabPanel value="2">
              <ImageGallery imageType="userImages" setTabValue={setValue} />
            </TabPanel>
            <TabPanel value="3">
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
        </div>
      </TabContext>
    </ThemeProvider>
  );
}

export default App;
