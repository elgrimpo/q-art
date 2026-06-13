"use client";

// Libraries imports
import React from "react";
import {
  Typography,
  Box,
  DialogContent,
  Toolbar,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";

//App imports
import StyledIconButton from "@/_components/StyledIconButton";
import { palette } from "@/_styles/palette";
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                              COMPONENT RENDER                              */
/* -------------------------------------------------------------------------- */

export default function Profile() {
  const { user } = useStore();

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <Box>
      {/* --------------------------------- APP BAR -------------------------------- */}
      <Toolbar display="flex" className="header">
        {/* LOGO */}
        <Image src="/logo.png" alt="Logo" width={40} height={40} />

        {/* CLOSE BUTTON */}
        <Box
          sx={{
            margin: { sx: "0rem", lg: "1rem" },
            position: "absolute",
            top: { xs: "0.5rem" },
            right: { xs: "0.5rem" },
            zIndex: "1",
          }}
        >
          <Link href="/generate">
            <StyledIconButton
              variant="contained"
              color="secondary"
              type="close"
            />
          </Link>
        </Box>
      </Toolbar>

      {/* ----------------------------- ACCOUNT DETAILS ---------------------------- */}

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h5"
          component="div"
          sx={{ flexGrow: 1, color: palette.secondary.dark, mb: "1rem" }}
          align="center"
        >
          Account Details
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
            height: "350px",
            borderRadius: "16px",
            backgroundColor: palette.primary.main,
            maxWidth: "600px",
            padding: "1rem",
          }}
        >
          {/* ACCOUNT NAME */}
          <Typography align="center" variant="subtitle2">
            Account name
          </Typography>
          <Typography align="center" variant="h6">
            {user.name}
          </Typography>
        </Box>
      </DialogContent>
    </Box>
  );
}
