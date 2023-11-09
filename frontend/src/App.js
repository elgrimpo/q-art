// Libraries imports
import * as React from "react";
import axios from "axios";
import { ThemeProvider } from "@mui/material/styles";
import TabContext from "@mui/lab/TabContext";
import TabPanel from "@mui/lab/TabPanel";
import { Tab, Tabs, Toolbar, Box, Button } from "@mui/material";
import { useEffect } from "react";

// App imports
import { ActionTypes } from "./context/reducers";
import { useImages, useImagesDispatch } from "./context/AppProvider";
import "./styles/App.css";
import theme from "./styles/mui-theme";
import Generate from "./pages/Generate/Generate";
import logo from "./assets/logo.png";
import MyCodes from "./pages/MyCodes/MyCodes";
import AccountMenu from "./pages/Home/AccountMenu";

function App() {
  const [value, setValue] = React.useState("1");
  const dispatch = useImagesDispatch();
  const { user } = useImages();
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Login
  const handleLogin = async () => {
    window.open("http://localhost:8000/login/google", "_self");
  };

  // Check if user session exists
  useEffect(() => {
    axios
      .get("http://localhost:8000/user/info", { withCredentials: true })
      .then((res) => {
        if (res.data._id) {
          // User logged in
          dispatch({
            type: ActionTypes.SET_USER,
            payload: res.data,
          });
        } else {
          // User not logged in
          console.log("not logged in");
        }
      });
  }, []);

  // Logout
  const handleLogout = async () => {
    axios
      .get("http://localhost:8000/logout", { withCredentials: true })
      .then(window.location.reload());
  };

  // Profile menu


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
                <AccountMenu handleLogout={handleLogout} />  
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
              <MyCodes />
            </TabPanel>
            <TabPanel value="3">Explore (Placeholder)</TabPanel>
          </div>
        </div>
      </TabContext>
    </ThemeProvider>
  );
}

export default App;
