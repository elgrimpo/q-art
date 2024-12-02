"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Box, Typography, Stack } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

export default function SignIn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const handleAnonymousSignIn = async () => {
      const isAnonymous = searchParams.get('anonymous') === 'true';
      const callbackUrl = searchParams.get('callbackUrl');
      
      if (isAnonymous) {
        console.log('SignIn: Initiating anonymous sign in');
        try {
          const result = await signIn("anonymous", { 
            redirect: false,
            callbackUrl: callbackUrl || '/'
          });
          
          if (result?.error) {
            console.error('SignIn: Anonymous sign in failed:', result.error);
          } else if (result?.url) {
            console.log('SignIn: Anonymous sign in successful, redirecting to:', result.url);
            router.push(result.url);
          }
        } catch (error) {
          console.error('SignIn: Error during anonymous sign in:', error);
        }
      }
    };

    handleAnonymousSignIn();
  }, [searchParams, router]);

  const handleGoogleSignIn = async () => {
    console.log('SignIn: Initiating Google sign in');
    // If we have a guest session, ensure it's included in the state
    if (session?.user?.is_guest) {
      console.log('SignIn: Current guest session ID:', session.user._id);
      // The guest ID will be captured by the JWT callback
    }
    await signIn("google", { 
      callbackUrl: "/generate",
    });
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
