"use client";
import Image from "next/image";
import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

function NoCodesEmptyState() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        maxWidth: "420px",
      }}
    >
      <Box sx={{ width: { xs: "220px", sm: "280px" }, mb: 3 }}>
        <Image
          src="/mycodes-empty-state.png"
          alt=""
          width={1536}
          height={1024}
          style={{ width: "100%", height: "auto" }}
          priority
        />
      </Box>

      <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
        No codes yet. Let&apos;s create your{" "}
        <Box component="span" sx={{ color: "primary.main" }}>
          first
        </Box>{" "}
        one.
      </Typography>

      <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
        Turn your ideas into stunning, scannable art.
      </Typography>

      <Button
        component={Link}
        href="/generate"
        variant="contained"
        color="primary"
        size="large"
        sx={{ mb: 3 }}
      >
        + Generate Your First Code
      </Button>

      <Button
        component={Link}
        href="/explore"
        variant="text"
        color="primary"
        startIcon={<AutoAwesomeIcon fontSize="small" />}
      >
        Explore images
      </Button>
    </Box>
  );
}

export default NoCodesEmptyState;
