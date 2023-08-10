// Libraries imports
import * as React from "react";
import axios from "axios";
import { ThemeProvider } from "@mui/material/styles";
import TabContext from "@mui/lab/TabContext";
import TabPanel from "@mui/lab/TabPanel";
import { Avatar, Tab, Tabs, Toolbar, Box, Button } from "@mui/material";


// App imports
import "./styles/App.css";
import theme from "./styles/mui-theme";
import { ImagesProvider } from "./context/AppProvider";
import Generate from "./pages/Generate/Generate";
import logo from "./assets/logo.png";
import MyCodes from "./pages/MyCodes/MyCodes";



function App() {
  const [value, setValue] = React.useState("1");
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleLogin = async () => {
    try {
      console.log("Login triggered")
      // Make a GET request to your backend login endpoint
      const response = await axios.get('http://localhost:8000/google-login');

      // Redirect the user to the authentication provider's login page
      window.location.href = response.data.redirect_uri;
    } catch (error) {
      console.error('Error during login:', error);
      // Handle error, e.g., show an error message to the user
    }
  }

  return (
    <ImagesProvider>
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
              <Button onClick={handleLogin}>Login</Button>
              <Avatar></Avatar>
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
    </ImagesProvider>
  );
}

export default App;
