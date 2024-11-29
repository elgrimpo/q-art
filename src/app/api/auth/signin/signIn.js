"use client";
import { signIn } from "next-auth/react";
import { Button, Box, Typography, TextField, Stack } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import FacebookIcon from "@mui/icons-material/Facebook";
import XIcon from "@mui/icons-material/X";

export default function SignIn() {
  const handleGoogleSignIn = () => {
    console.log('SignIn: Initiating Google sign in');
    signIn("google", { callbackUrl: "/generate" });
  };

  return (
    <Box
      sx={{
        width: "300px",
        height: "100%",
        maxHeight: "400px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        backgroundColor: "white",
      }}
    >
      <Stack useFlexGap flexWrap="wrap" spacing={1} sx={{ width: "100%" }}>
        <Typography variant="h5" align="center">
          Sign in to QR AI
        </Typography>

        <Button
          startIcon={<GoogleIcon />}
          variant="contained"
          color="primary"
          onClick={handleGoogleSignIn}
        >
          Google
        </Button>
      </Stack>
    </Box>
  );
}
