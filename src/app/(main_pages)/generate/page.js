"use client";

// Libraries imports
import React, { useState } from "react";
import { Box, Typography, Button, Card, CardMedia, Grid } from "@mui/material";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// App imports
import GenerateForm from "./GenerateForm";
import { useStore } from "@/store";
import "../../globals.css";

export default function Generate() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  // Context variables
  const { user } = useStore();

  // Image gallery from NotSignedIn
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
      // className="generate-page"
      sx={{
        width: "100%",
        maxWidth: "1600px",
        padding: {xs: "0rem 0rem 5rem 0rem", lg: "5rem 1rem"},
        backgroundColor: "#161616",
      }}
    >
      <Head>
        <title>
          AI QR Code Art Generator | Create Beautiful QR Code Designs
        </title>
        <meta
          name="description"
          content="Transform your URLs into stunning AI-generated QR code artwork. Create unique, custom QR code designs with our artistic QR code generator. Free trial available!"
        />
        <meta
          name="keywords"
          content="AI QR code generator, artistic QR code creator, custom QR code design, QR code art generator, beautiful QR code maker, generative AI QR Code"
        />
        <meta
          property="og:title"
          content="Create Beautiful AI QR Code Art | Custom QR Code Generator"
        />
        <meta
          property="og:description"
          content="Transform URLs into stunning AI-generated artwork with embedded QR codes. Create unique, scannable art for your brand."
        />
        <meta property="og:image" content={imageGallery[0].url} />
      </Head>

      {/*----------------- Banner Section --------------- */}

      <Box
        className="BannerSection"
     
      >
        {/* Gradient */}
        <Box
          className="Gradient"
          sx={{
            width: { xs: "100%", lg: "90%" },
            zIndex: 2,
            height: "100%",
            top: { xs: "100px", lg: "0px" },
            ml: { xs: "0px", lg: "24px" },
            background: {
              xs: "linear-gradient(0deg, rgba(22,22,22,1) 30%, rgba(22,22,22,0) 90%)",
              lg: "linear-gradient(90deg, rgba(22,22,22,1) 55%, rgba(22,22,22,0) 90%)",
            },
          }}
        />

        {/*  Banner Image  */}
        <Box
          className="BannerImage"
          sx={{
            backgroundColor: "#A5FFC3",
            padding: { xs: "0.5rem", sm: "1rem" },
            paddingTop: { xs: "4.7rem", sm: "4.7rem", lg: "1rem" },
            width: { xs: "100vw", lg: "70%"},
            borderRadius: { xs: "0px", lg: "5px" },
            aspectRatio: "1/1",
            justifySelf: "end",
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

        {/* Generate Form */}
        <Box
          className="GenerateForm"
          sx={{
            width: { xs: "100%", lg: "900px" },
            padding: "1rem",
            pt: { xs: "60%", lg: "10%" },
            zIndex: 3,
            left: { xs: "0px", lg: "1rem" },
            textAlign: { xs: "center", lg: "left" },
          }}
        >
          <Typography
            variant="h1"
            color="primary"
            sx={{ fontSize: { xs: "3rem", sm: "3rem", md: "5rem" } }}
          >
            Turn your QR Code into a piece of Art
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: { xs: "center", lg: "flex-start" },
            }}
          >
            <GenerateForm />
          </Box>
        </Box>
      </Box>

      {/* -------------------- Image Gallery Section --------------------- */}

      {user?.is_guest && (
        <Box sx={{ mt: 6 }}>
          <Typography
            variant="h3"
            color="primary"
            align="center"
            sx={{
              mb: 4,
              p: 2,
              fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
            }}
          >
            Create Unique Images to represent your brand
          </Typography>

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
              sx={{
                mb: "1.5rem",
                padding: { xs: "0.5rem", sm: "1rem" },
                maxWidth: "1200px",
              }}
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
            <Link href="/explore" passHref legacyBehavior>
              <Button variant="contained">Explore more Images</Button>
            </Link>
          </Box>
        </Box>
      )}
    </Box>
  );
}
