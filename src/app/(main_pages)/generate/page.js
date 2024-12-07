"use client";

// Libraries imports
import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardMedia,
  Grid,
  Skeleton,
} from "@mui/material";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/navigation";
import * as amplitude from "@amplitude/analytics-browser";
import { useSession } from "next-auth/react";

// App imports
import GenerateForm from "./GenerateForm";
import SimpleDialog from "@/_components/SimpleDialog";
import { useStore } from "@/store";
import { generateImage } from "@/_utils/ImagesUtils";
import { palette } from "@/_styles/palette";

export default function Generate() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  // Context variables
  const {
    user,
    generateFormValues,
    openAlert,
    generatingImage,
    setGeneratingImage,
  } = useStore();

  // Dialog Content
  const [dialogContent, setDialogContent] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleInsufficientCredits = () => {
    const description = user?.is_guest
      ? "Sign up to get more credits and unlock all features!"
      : "You don't have enough credits to generate this image. Please go to your account to purchase additional credits.";

    setDialogContent({
      title: "Insufficient Credits",
      description,
      primaryActionText: user?.is_guest ? "Sign Up" : "Add Credits",
      primaryAction: () =>
        router.push(user?.is_guest ? "/api/auth/signin" : "/profile"),
      secondaryActionText: "Close",
      secondaryAction: handleDialogClose,
    });
    setDialogOpen(true);
  };

  const updateGuestCredits = async (newCredits) => {
    try {
      const result = await updateSession({
        ...session,
        user: {
          ...session.user,
          credits: newCredits,
        },
      });

      useStore.setState({
        user: {
          ...user,
          credits: newCredits,
        },
      });

      if (result?.user?.credits === newCredits) {
        return true;
      } else {
        console.error("updateGuestCredits: Credits update verification failed");
        return false;
      }
    } catch (error) {
      console.error("updateGuestCredits: Error updating credits:", error);
      return false;
    }
  };

  const handleGenerate = async () => {
    setGeneratingImage(true);

    try {
      if (user?.credits < 1) {
        handleInsufficientCredits();
        setGeneratingImage(false);
        return;
      }

      amplitude.track("Generate Image", {
        userId: user?.id,
        url: generateFormValues.website,
        style_title: generateFormValues.style_title,
        qr_weight: generateFormValues.qr_weight,
        isGuest: user?.is_guest || false,
      });

      const image = await generateImage(generateFormValues, user);

      setGeneratingImage(false);
      openAlert("success", "Image generated successfully!");

      if (user?.is_guest) {
        const newCredits = user.credits - 1;
        const updated = await updateGuestCredits(newCredits);

        if (updated) {
          router.push(`/images/${image._id}?isNewGuestImage=true`);
        } else {
          console.error("handleGenerate: Failed to update credits");
          openAlert(
            "error",
            "Failed to update credits. Please refresh the page."
          );
        }
      } else {
        router.push(`/images/${image._id}`);
      }
    } catch (error) {
      console.error("handleGenerate: Generation error:", error);
      if (error.message === "InsufficientCredits") {
        handleInsufficientCredits();
      } else {
        openAlert("error", "Failed to generate image. Please try again.");
      }
      setGeneratingImage(false);
    }
  };

  return (
    <Box
      // className="generate-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#161616",
        minHeight: "100vh",
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
      {user?.is_guest && (
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
          {/* Gradient */}
          <Box
            sx={{
              position: "absolute",
              width: { xs: "100%", md: "90%" },
              height: "100%",
              top: { xs: "100px", md: "0px" },
              zIndex: 2,
              left: { xs: "0px", md: "24px" },
              background: {
                xs: "linear-gradient(0deg, rgba(22,22,22,1) 30%, rgba(22,22,22,0) 90%)",
                md: "linear-gradient(90deg, rgba(22,22,22,1) 55%, rgba(22,22,22,0) 90%)",
              },
            }}
          />

          {/* Banner Text */}
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
              Create an account or try it out for free!
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: { xs: "center", md: "flex-start" },
              }}
            >
              <Link href="/api/auth/signin" passHref legacyBehavior>
                <Button variant="contained">Create Account</Button>
              </Link>
              <Link href="/generate" passHref legacyBehavior>
                <Button variant="outlined">Try it out</Button>
              </Link>
            </Box>
          </Box>

          {/*  Banner Image  */}
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
      )}

      {/* ------------------ Generate Form -------------------- */}

      {!generatingImage ? (
        <GenerateForm handleGenerate={handleGenerate} />
      ) : (
        <Box
          sx={{
            position: "relative",
            padding: "1rem",
            mt: { xs: 30, sm: 16, md: 12 },
            width: "100%",
            maxWidth: "800px",
            margin: "auto",
            borderRadius: "8px",
            backgroundColor: palette.primary.light,
          }}
        >
          <Typography variant="h5" align="center" color="secondary">
            Our superhuman AI is working on your QR Code!
          </Typography>

          <Box
            sx={{
              margin: "1rem 0rem",
              width: "100%",
              maxWidth: "800px",
              height: "400px",
              backgroundImage:
                'url("https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXd0ZmY4N3VweW54ejIwN29yaGQxcmdtOWh5aGZuMG1wZW5mdHprYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/R8dDMt8IgVvhK/giphy.gif")',
              backgroundSize: "cover",
              backgroundPosition: "center 25%",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          ></Box>
          <Typography variant="subtitle1" align="center">
            He's slow so give him a minute!
          </Typography>
        </Box>
      )}

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

      {/* Dialog Modal */}
      <SimpleDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title={dialogContent.title}
        description={dialogContent.description}
        primaryActionText={dialogContent.primaryActionText}
        primaryAction={dialogContent.primaryAction}
        secondaryActionText={dialogContent.secondaryActionText}
        secondaryAction={dialogContent.secondaryAction}
      />
    </Box>
  );
}
