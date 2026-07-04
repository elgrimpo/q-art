"use client";
import Image from "next/image";
import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddIcon from "@mui/icons-material/Add";

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
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: "600px",
          aspectRatio: "3 / 2",
          overflow: "hidden",
          mb: 1,
        }}
      >
        <Image
          src="/mycodes-empty-state.png"
          alt=""
          fill
          style={{ objectFit: "cover", transform: "scale(1.54)" }}
          priority
        />
      </Box>

      <Typography variant="h3" component="h2" sx={{ mb: 1 }}>
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
        startIcon={<AddIcon />}
        sx={{ mb: 3 }}
      >
        Generate Your First Code
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
