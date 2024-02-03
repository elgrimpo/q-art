import { Inter } from "next/font/google";
import "../globals.css";
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
import Link from "next/link";

import theme from "../../styles/theme";
import NavBar from "../../components/NavBar";


const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "QR AI",
  description: "Generate Art with QR Codes",
};

export default function Layout({ children }) {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // Context
  // const {
  //   user,
  //   alertOpen,
  //   alertSeverity,
  //   alertMessage,
  //   generatedImage,
  //   userImages,
  // } = useImages();

  // Utils functions
  // const { getUserInfo, logout, closeAlert } = useUtils();

  /* -------------------------------- FUNCTIONS ------------------------------- */

  // Login
  // const handleLogin = async () => {
  //   window.open(
  //     `${process.env.REACT_APP_BACKEND_URL}/api/login/google`,
  //     "_self"
  //   );
  // };
  // // Check if user session exists
  // useEffect(() => {
  //   getUserInfo();
  // }, [generatedImage, userImages, getUserInfo]);

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <div>
      {/* ------------------------------- NAVIGATION ------------------------------- */}

      <NavBar />

      {/* ------------------------------ APP BAR ----------------------------- */}
      <AppBar sx={{ backgroundColor: "white", boxShadow: "none", zIndex: 500 }}>
        <Container
          maxWidth="xl"
          sx={{
            padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 },
          }}
        >
          <Toolbar display="flex" className="header">
            {/* LOGO */}
            <img src="/logo.png" alt="Logo" />
            <Box sx={{ flexGrow: 1 }}></Box>

            {/* ACCOUNT */}
            {/* {user._id ? ( */}
            {/* <AccountMenu handleLogout={logout} /> */}
            {/* ) : ( */}
            <Button
            // onClick={handleLogin}
            >
              Login
            </Button>
            {/* )} */}
          </Toolbar>
        </Container>
      </AppBar>

      {/* --------------------------- APP CONTENT -------------------------- */}

      <div className="body">
        <Container
          maxWidth="xl"
          sx={{ padding: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 } }}
        >
          {children}
        </Container>
      </div>

      {/* ---------------------------- SNACKBAR -------------------------- */}
      {/* <Snackbar
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
        </Snackbar> */}
    </div>
  );
}
