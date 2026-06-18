"use client";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Button,
  Box,
  Typography,
  Stack,
  TextField,
  Divider,
  Link,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

const ERROR_MESSAGES = {
  InvalidEmail: "Please enter a valid email address.",
  ResendCooldown: "Please wait a moment before requesting another code.",
  TooManyRequests: "Too many code requests. Try again later.",
  RequestFailed: "Couldn't send the code. Please try again.",
};

export default function SignIn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const handleAnonymousSignIn = async () => {
      const isAnonymous = searchParams.get("anonymous") === "true";
      if (isAnonymous) {
        try {
          const result = await signIn("anonymous", {
            redirect: false,
            callbackUrl: "/generate",
          });
          if (result?.error) {
            console.error("SignIn: Anonymous sign in failed:", result.error);
          } else if (result?.url) {
            router.push(result.url);
          }
        } catch (err) {
          console.error("SignIn: Error during anonymous sign in:", err);
        }
      }
    };
    handleAnonymousSignIn();
  }, [searchParams, router]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleGoogleSignIn = async () => {
    await signIn("google", { callbackUrl: "/generate" });
  };

  const sendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(ERROR_MESSAGES[body.error] || ERROR_MESSAGES.RequestFailed);
        return;
      }
      setStep("code");
      setCooldown(60);
    } catch {
      setError(ERROR_MESSAGES.RequestFailed);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("email-code", {
        email,
        code,
        redirect: false,
        callbackUrl: "/generate",
      });
      if (result?.error) {
        setError("We couldn't sign you in with that code. Please try again or resend a new code.");
      } else if (result?.url) {
        // Full-page navigation (not router.push): the root layout seeds auth
        // state via getUserInfo() on a server render, which a soft client
        // navigation would skip — leaving the user "signed in but not logged in".
        window.location.assign(result.url);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "320px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        backgroundColor: "white",
      }}
    >
      <Stack useFlexGap spacing={2} sx={{ width: "100%" }}>
        <Typography variant="h5" align="center">
          Sign in to QR AI
        </Typography>

        {step === "email" && (
          <>
            <Button
              startIcon={<GoogleIcon />}
              variant="contained"
              color="primary"
              onClick={handleGoogleSignIn}
            >
              Continue with Google
            </Button>

            <Divider>or</Divider>

            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <Button
              variant="outlined"
              disabled={loading || !email.trim()}
              onClick={sendCode}
            >
              Continue with email
            </Button>
          </>
        )}

        {step === "code" && (
          <>
            <Typography variant="body2" align="center">
              We sent a 6-digit code to <strong>{email}</strong>.
            </Typography>
            <TextField
              label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputProps={{ inputMode: "numeric", maxLength: 6 }}
              fullWidth
            />
            <Button
              variant="contained"
              color="primary"
              disabled={loading || code.length < 6}
              onClick={verifyCode}
            >
              Verify & sign in
            </Button>
            <Button
              variant="text"
              disabled={cooldown > 0 || loading}
              onClick={sendCode}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </Button>
            <Link
              component="button"
              variant="body2"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
              }}
            >
              Use a different email
            </Link>
          </>
        )}

        {error && (
          <Typography variant="body2" color="error" align="center">
            {error}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
