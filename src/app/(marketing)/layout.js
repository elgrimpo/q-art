import { Box, Container } from "@mui/material";

import NavBarDesktop from "../(main_pages)/(navbar)/NavBarDesktop";
import NavBarMobile from "../(main_pages)/(navbar)/NavBarMobile";
import Footer from "../(main_pages)/Footer";

export default function MarketingLayout({ children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "background.default" }}>
      <NavBarDesktop />
      <NavBarMobile />
      <Container
        maxWidth="xl"
        sx={{ px: { xs: 2, md: 4 }, pt: { xs: "4.7rem", sm: "5rem" }, pb: 4, flex: 1 }}
      >
        {children}
      </Container>
      <Footer />
    </Box>
  );
}
