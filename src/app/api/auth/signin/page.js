'use client'

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box } from "@mui/material";

// App imports
import SignIn from "./signIn";
import { palette } from "../../../../_styles/palette";

export default function SignInPage() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const isAnonymous = searchParams.get('anonymous') === 'true';
    const callbackUrl = searchParams.get('callbackUrl');
    console.log('SignInPage: URL parameters:', { isAnonymous, callbackUrl });
  }, [searchParams]);

  return (
    <Box
      sx={{
        backgroundColor: palette.primary.light,
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SignIn />
    </Box>
  );
}
