import { Box } from "@mui/material";

// App imports
import SignIn from "./signIn";
import { palette } from "@/_styles/palette";

export default function SignInPage() {
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
