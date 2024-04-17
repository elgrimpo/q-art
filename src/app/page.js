import { Box, Typography, Button, Card, CardMedia, Grid } from "@mui/material";
import { useRouter } from "next/navigation";
import Link from "next/link";

// App imports
import NavBar from "./(main_pages)/NavBar";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#161616",
        // alignItems: "stretch",
        // alignContent: "stretch",
      }}
    >
      {/* NAV BAR */}
      <NavBar />

      {/* --------------------------------- BANNER --------------------------------- */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          position: "relative",
          padding: "32px",
          display: "flex",
          width: "100%",
          maxWidth:"1500px",
          margin: "auto",
          mt: "100px"

        }}
      >
        {/*  GRADIENT  */}
        <div
          style={{
            position: "absolute",
            width: "90%",
            height: "100%",
            top: "0px",
            right: "250px",
            zIndex: 2,
            left: "24px",
            background:
              "linear-gradient(90deg, rgba(22,22,22,1) 55%, rgba(22,22,22,0) 90%)",
          }}
        ></div>
        
        {/*  BANNER TEXT  */}
        <div
          style={{
            position: "absolute",
            width: "900px",
            height: "400px",
            top: "20%",
            zIndex: 2,
            left: "24px",
          }}
        >
          <Typography variant="h1" color="primary">
            Turn your QR Code into a piece of Art
          </Typography>
          <Typography variant="h5" color="primary" sx={{ mt: 6, mb: 2 }}>
            Create an account to get started for free!
          </Typography>
          <Link href="/api/auth/signin" passHref legacyBehavior>
            <Button variant="contained">Create Account</Button>
          </Link>
        </div>
        {/*  BANNER IMAGE  */}
        <img
          component="img"
          src="https://qrartimages.s3.us-west-1.amazonaws.com/654f3d47bef0549f910f70ca.png"
          style={{
            borderRadius: "5px",
            border: "solid 18px #A5FFC3",
            width: "50%",
            aspectRatio: "1/1",
            zIndex: 1,
            order: 2,
          }}
        />
      </Box>
      {/* ------------------------------ IMAGE GALLERY ----------------------------- */}
      <div>

        {/* TITLE */}
        <Typography
          variant="h3"
          color="primary"
          align="center"
          sx={{ mt: 12, mb: 4 }}
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
            sx={{ mb: "1.5rem", padding: "12px", maxWidth: "1200px" }}
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
        <div style={{ textAlign: "center", padding: "2rem" }}>

          {/* EXPLORE BUTTON */}
          <Link href="/explore" passHref legacyBehavior>
            <Button variant="contained">Explore more Images</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
