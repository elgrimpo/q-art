"use client";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Box,
  Stack,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Link,
} from "@mui/material";
import Image from "next/image";
import GoogleIcon from "@mui/icons-material/Google";
import QrAiWordmark from "@/_components/QrAiWordmark";

const ERROR_MESSAGES = {
  InvalidEmail:    "Please enter a valid email address.",
  ResendCooldown:  "Please wait a moment before requesting another code.",
  TooManyRequests: "Too many code requests. Try again later.",
  RequestFailed:   "Couldn't send the code. Please try again.",
};

export default function SignIn() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [step,     setStep]     = useState("email");
  const [email,    setEmail]    = useState("");
  const [code,     setCode]     = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const isAnonymous = searchParams.get("anonymous") === "true";
    if (!isAnonymous) return;
    (async () => {
      try {
        const result = await signIn("anonymous", { redirect: false, callbackUrl: "/generate" });
        if (result?.error) console.error("SignIn: Anonymous sign in failed:", result.error);
        else if (result?.url) router.push(result.url);
      } catch (err) {
        console.error("SignIn: Error during anonymous sign in:", err);
      }
    })();
  }, [searchParams, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleGoogleSignIn = () => signIn("google", { callbackUrl: "/generate" });

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
        email, code, redirect: false, callbackUrl: "/generate",
      });
      if (result?.error) {
        setError("We couldn't sign you in with that code. Please try again or resend a new code.");
      } else if (result?.url) {
        // Full-page navigation so the root layout re-reads the session server-side.
        window.location.assign(result.url);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#161616" }}>
      {/* LEFT — full-height artwork inside a 24px primary.light frame.
          The form keeps a reserved width (540px); the panel is square when there's room
          (width capped at viewport height) and only loses WIDTH when space is tight —
          height always fills the viewport, so it goes square → portrait, never a small
          floating square. No squeeze breakpoint — only hidden on small (xs/sm) screens. */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexShrink: 0,
          height: "100vh",
          width: "min(100vh, calc(100vw - 540px))",
          p: "24px",
          backgroundColor: "primary.light",
        }}
      >
        <Box
          sx={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: 5,
            borderRadius: "16px",
            overflow: "hidden",
            color: "common.white",
            backgroundImage: "url('/signin-art.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Gradient so the overlaid logo + copy stay legible on the artwork. */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)",
            }}
          />
          <Box sx={{ position: "relative", zIndex: 1, maxWidth: 460 }}>
            <Typography
              variant="h3"
              sx={{ color: "common.white", fontSize: "clamp(1.35rem, 2.3vw, 1.9rem)", lineHeight: 1.15 }}
            >
              Turn any URL into AI-generated artwork.
            </Typography>
            <Typography
              variant="body1"
              sx={{ mt: 1.5, color: "rgba(255,255,255,0.85)", fontSize: "clamp(0.82rem, 1.05vw, 0.95rem)" }}
            >
              Watercolor, cyberpunk, low-poly, oil painting — every code stays a working QR.
              No design skills required.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* RIGHT — sign-in form */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#161616",
          p: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 420 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "16px", mb: 4 }}>
            <Image src="/logo_light.png" alt="Logo" width={32} height={32} />
            <QrAiWordmark />
          </Box>

          <Typography
            variant="h3"
            sx={{ color: "primary.light", fontSize: { xs: "2rem", md: "2.25rem" }, mb: 1 }}
          >
            Sign in to QR AI
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: "grey.400" }}>
            Welcome back. Pick up where your art left off.
          </Typography>

          <Paper
            elevation={0}
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              p: 3,
              borderRadius: "16px",
            }}
          >
            {step === "email" && (
              <Box
                component="form"
                onSubmit={(e) => { e.preventDefault(); sendCode(); }}
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <TextField
                  className="form-field"
                  variant="outlined"
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading || !email.trim()}
                  fullWidth
                >
                  {loading ? "Sending…" : "Continue with email"}
                </Button>

                <Divider>or</Divider>

                <Button
                  type="button"
                  variant="contained"
                  color="secondary"
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleSignIn}
                  fullWidth
                >
                  Continue with Google
                </Button>
              </Box>
            )}

            {step === "code" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  We sent a 6-digit code to <strong>{email}</strong>.
                </Typography>
                <TextField
                  className="form-field"
                  variant="outlined"
                  label="6-digit code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputProps={{ inputMode: "numeric", maxLength: 6 }}
                  fullWidth
                />
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  disabled={loading || code.length < 6}
                  onClick={verifyCode}
                  fullWidth
                >
                  {loading ? "Verifying…" : "Verify & sign in"}
                </Button>
                <Stack spacing={0.5} alignItems="center">
                  <Button
                    type="button"
                    variant="text"
                    size="small"
                    color="primary"
                    disabled={cooldown > 0 || loading}
                    onClick={sendCode}
                  >
                    {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
                  </Button>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={() => { setStep("email"); setCode(""); setError(""); }}
                    sx={{ color: "primary.light" }}
                  >
                    Use a different email
                  </Link>
                </Stack>
              </Box>
            )}

            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Paper>

          <Typography variant="caption" component="p" sx={{ mt: 3, color: "grey.500" }}>
            By continuing you agree to QR AI&#8217;s{" "}
            <Link href="/terms" sx={{ color: "primary.light" }}>Terms</Link>{" "}and{" "}
            <Link href="/privacy" sx={{ color: "primary.light" }}>Privacy Policy</Link>.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
