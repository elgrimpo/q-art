import { Box, Typography, Button, Card, CardMedia, Grid } from "@mui/material";
import Link from "next/link";

// App imports
import NavBarDesktop from "./(main_pages)/(navbar)/NavBarDesktop";
import NavBarMobile from "./(main_pages)/(navbar)/NavBarMobile";
import theme from "@/_styles/theme";

export default function NotSignedIn() {
  const imageGallery = [
    {
      url: "https://qrartimages.s3.us-west-1.amazonaws.com/654f34f6bef0549f910f70a5.png",
    },
    {
      url: "https://qrartimages.s3.us-west-1.amazonaws.com/64cda0d622cec9423f676916.png",
    },
    {
      url: "https://qrartimages.s3.us-west-1.amazonaws.com/65513586f4adf8ea932b06a7.png",
    },
    {
      url: "https://qrartimages.s3.us-west-1.amazonaws.com/658693d768084531da6282fb.png",
    },
    {
      url: "https://qrartimages.s3.us-west-1.amazonaws.com/65d7d2aef7ebe3fe4491aab8.png",
    },
    {
      url: "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#161616",
        // alignItems: "stretch",
        // alignContent: "stretch",
      }}
    >
      {/* NAV BAR */}
      <NavBarDesktop />
      <NavBarMobile />

      {/* --------------------------------- BANNER --------------------------------- */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          position: "relative",
          padding: { xs: "0px", md: "1rem" },
          paddingTop: { xs: 0, md: "5rem" },
          display: "flex",
          width: "100%",
          maxWidth: "1500px",
          margin: "auto",
        }}
      >
        {/*  GRADIENT  */}
        <Box
          sx={{
            position: "absolute",
            width: { xs: "100%", md: "90%" },
            height: "100%",
            top: {xs: "100px", md: "0px"},
            // right: "250px",
            zIndex: 2,
            left: { xs: "0px", md: "24px" },
            background: {
              xs: "linear-gradient(0deg, rgba(22,22,22,1) 30%, rgba(22,22,22,0) 90%)",
              md: "linear-gradient(90deg, rgba(22,22,22,1) 55%, rgba(22,22,22,0) 90%)",
            },
          }}
        ></Box>

        {/*  BANNER TEXT  */}
        <Box
          sx={{
            position: "absolute",
            width: { xs: "100%", md: "900px" },
            padding: "1rem",
            height: "400px",
            top: { xs: "60%", md: "20%" },
            zIndex: 2,
            left: { xs: "0px", md: "1rem" },
            textAlign: { xs: "center", md: "left" },
          }}
        >
          <Typography
            variant="h1"
            color="primary"
            sx={{ fontSize: { xs: "3rem", sm: "4rem", md: "6rem" } }}
          >
            Turn your QR Code into a piece of Art
          </Typography>
          <Typography variant="h5" color="primary" sx={{ mt: 6, mb: 2 }}>
            {" "}
            Create an account and try it out for free!
          </Typography>
          <Link href="/api/auth/signin" passHref legacyBehavior>
            <Button variant="contained">Create Account</Button>
          </Link>
        </Box>

        {/*  BANNER IMAGE  */}
        <Box
          sx={{
            backgroundColor: "#A5FFC3",
            padding: { xs: "0.5rem", sm: "1rem" },
            paddingTop: { xs: "4.7rem", sm: "4.7rem", md: "1rem" },
            width: { xs: "100%", md: "60%", lg: "60%" },
            borderRadius: { xs: "0px", md: "5px" },
            aspectRatio: "1/1",
          }}
        >
          <CardMedia
            component="img"
            src="https://qrartimages.s3.us-west-1.amazonaws.com/654f3d47bef0549f910f70ca.png"
            sx={{
              borderRadius: "5px",
              aspectRatio: "1/1",
              zIndex: 1,
              order: 2,
            }}
          />
        </Box>
      </Box>
      {/* ------------------------------ IMAGE GALLERY ----------------------------- */}
      <Box sx={{ mt: { xs: 30, sm: 16, md: 12 } }}>
        {/* TITLE */}
        <Typography
          variant="h3"
          color="primary"
          align="center"
          sx={{ mb: 4, p: 2, fontSize: { xs: "2rem", sm: "3rem", md: "4rem" } }}
        >
          Create Unique Images to represent your brand
        </Typography>

        {/* IMAGE GRID */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            backgroundColor: "#A5FFC3",
          }}
        >
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="stretch"
            spacing={2}
            sx={{ mb: "1.5rem", padding: {xs: "0.5rem", sm: "1rem"}, maxWidth: "1200px" }}
          >
            {imageGallery.map((image, index) => (
              <Grid item key={index} xs={12} sm={6} md={4} lg={4} xl={4}>
                <Card key={index} elevation={0}>
                  <CardMedia
                    image={image.url}
                    key={index}
                    xs={1}
                    component="img"
                    sx={{ width: "100%" }}
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box sx={{ textAlign: "center", padding: "2rem" }}>
          {/* EXPLORE BUTTON */}
          <Link href="/explore" passHref legacyBehavior>
            <Button variant="contained">Explore more Images</Button>
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
