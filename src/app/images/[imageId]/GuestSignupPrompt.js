"use client";

import React from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import Link from "next/link";

export default function GuestSignupPrompt() {
  return (
    <Box
      sx={{
        flex: "1",
        padding: "3rem",
        minWidth: "300px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Typography variant="h4" sx={{ mb: 3 }}>
        Your QR Art is Ready!
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Sign in now to save your creation and generate more amazing QR codes.
      </Typography>
      <Stack
        spacing={2}
        direction="column"
        sx={{ width: "100%", maxWidth: "200px" }}
      >
        <Link href="/api/auth/signin" passHref legacyBehavior>
          <Button variant="contained" fullWidth>
            Sign In
          </Button>
        </Link>
      </Stack>
    </Box>
  );
}
