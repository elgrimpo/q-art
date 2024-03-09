// Libraries imports
import React from "react";
import {
  Typography,
  Box,
  DialogContent,
  Toolbar,
  Grid,
  IconButton,
} from "@mui/material";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";
import Link from "next/link";
import Image from "next/image";

//App imports
import PurchaseCard from "./PurchaseCard";
import StyledIconButton from "@/_components/StyledIconButton";
import { getUserInfo } from "@/_utils/userUtils";
import { palette } from "@/_styles/palette";

/* -------------------------------------------------------------------------- */
/*                              COMPONENT RENDER                              */
/* -------------------------------------------------------------------------- */

export default async function Profile() {
  const user = await getUserInfo();

  const purchaseItems = [
    {
      creditAmount: 50,
      price: 5,
      stripeId: "price_1OpIN8AaPyl1Ov3Pi3q6dkEC",
      image: "/one_diamond.png",
    },
    {
      creditAmount: 100,
      price: 9,
      stripeId: "price_1OpINoAaPyl1Ov3PufRg0KrR", 
      image: "/two_diamonds.png",
    },
    {
      creditAmount: 250,
      price: 20,
      stripeId: "price_1OpIOmAaPyl1Ov3P170gEWNn", 
      image: "/three_diamonds.png",
    },
  ];

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

          {/* USER CREDITS */}
          <Typography align="center" variant="subtitle2" sx={{ mt: "1rem" }}>
            Available credits
          </Typography>
          <Box
            sx={{
              backgroundColor: palette.primary.light,
              padding: "0.5rem",
              borderRadius: "8px",
              width: "200px",
              margin: "0px auto",
            }}
          >
            <Typography align="center" variant="h6">
              <IconButton color="secondary">
                <DiamondTwoToneIcon />
              </IconButton>
              {user.credits}
            </Typography>
          </Box>
        </Box>
        <Typography
          variant="h5"
          align="center"
          color="secondary"
          sx={{ m: "2rem" }}
        >
          Purchase Credits
        </Typography>

        {/* ---------------------------- PURCHASE CREDITS ---------------------------- */}
        <Grid
          container
          spacing={2}
          columns={{ xs: 1, md: 3 }}
          justifyContent="center"
          alignItems="center"
          sx={{ display: "flex", flexDirection: "row", maxWidth: "900px" }}
        >
          {purchaseItems.map((item, index) => (
            <PurchaseCard purchaseItem={item} key={index} user={user} />
          ))}
        </Grid>
      </DialogContent>
    </Box>
  );
}
