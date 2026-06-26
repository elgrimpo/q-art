"use client";

import React from "react";
import { Box, Typography, Button, Card, CardMedia, Grid } from "@mui/material";
import Link from "next/link";

import { useStore } from "@/store";

const imageGallery = [
  { url: "https://qrartimages.s3.us-west-1.amazonaws.com/654f34f6bef0549f910f70a5.png" },
  { url: "https://qrartimages.s3.us-west-1.amazonaws.com/64cda0d622cec9423f676916.png" },
  { url: "https://qrartimages.s3.us-west-1.amazonaws.com/65513586f4adf8ea932b06a7.png" },
  { url: "https://qrartimages.s3.us-west-1.amazonaws.com/658693d768084531da6282fb.png" },
  { url: "https://qrartimages.s3.us-west-1.amazonaws.com/65d7d2aef7ebe3fe4491aab8.png" },
  { url: "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png" },
];

export default function GuestGallery() {
  const { user } = useStore();

  if (!user?.is_guest) return null;

  return (
    <Box sx={{ mt: 6 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          backgroundColor: "primary.light",
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
  );
}
