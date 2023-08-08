import { Avatar, Tab, Tabs, Toolbar, Box } from "@mui/material";
import "./App.css";
import Generate from "./Generate";
import logo from "./logo.png";
import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./mui-theme";
import TabContext from "@mui/lab/TabContext";
import TabPanel from "@mui/lab/TabPanel";
import MyCodes from "./MyCodes";
import {ImagesProvider} from "./AppProvider";


function App() {
  const [value, setValue] = React.useState(0);
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

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
