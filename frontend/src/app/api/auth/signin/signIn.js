"use client";
import { signIn } from "next-auth/react";
import { Button, Box, Typography, TextField, Stack } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import FacebookIcon from "@mui/icons-material/Facebook";

export default function SignIn() {
  return (
    <Box
      sx={{
        width: "400px",
        height: "100%",
        maxHeight: "400px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem 2rem",
        backgroundColor: "white",
      }}
    >
      <Stack useFlexGap flexWrap="wrap" spacing={1} sx={{ width: "100%" }}>
        {/* <Typography variant="h5" align="center">
          Sign in to QR AI
        </Typography>
        <TextField
          required
          id="username"
          label="Username"
          name="username"
          value=""
          onChange=""
          variant="outlined"
        />
        <TextField
          required
          id="password"
          label="Password"
          name="password"
          value=""
          onChange=""
          variant="outlined"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() =>
            signIn("google", { callbackUrl: "/generate" })
          }
          sx={{ mb: "1rem" }}
        >
          Sign in
        </Button>*/}

        <Typography variant="h6" align="center">
          Sign in with
        </Typography>

        <Button
          startIcon={<GoogleIcon />}
          variant="outlined"
          color="primary"
          onClick={() => signIn("google", { callbackUrl: "/generate" })}
        >
          Google
        </Button>
        {/* <Button
          startIcon={<FacebookIcon />}
          variant="outlined"
          color="primary"
          onClick={() =>
            signIn("google", { callbackUrl: "/generate" })
          }
        >
          Facebook
        </Button> */}
      </Stack>
    </Box>
  );
}
