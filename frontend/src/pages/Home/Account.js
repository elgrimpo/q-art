import React, { useState, useEffect } from "react";
import {
  Fab,
  Typography,
  Box,
  Dialog,
  DialogContent,
  Toolbar,
  Grid,
  IconButton,
} from "@mui/material";
import { Link } from "react-router-dom";
import CloseTwoToneIcon from "@mui/icons-material/CloseTwoTone";
import theme from "../../styles/mui-theme";
import DiamondTwoToneIcon from "@mui/icons-material/DiamondTwoTone";

//App imports
import { useImages } from "../../context/AppProvider";
import PurchaseCard from "./PurchaseCard";
import logo from "../../assets/logo.png";
import one_diamond from "../../assets/one_diamond.png";
import two_diamonds from "../../assets/two_diamonds.png";
import three_diamonds from "../../assets/three_diamonds.png";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function Account() {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */
  const { user } = useImages();

  const [message, setMessage] = useState("");

  const purchaseItems = [
    {
      creditAmount: 100,
      price: 10,
      stripeId: "price_1OEfQEAaPyl1Ov3PGzbZPdgD",
      image: one_diamond,
    },
    {
      creditAmount: 500,
      price: 45,
      stripeId: "price_1OEfQEAaPyl1Ov3PGzbZPdgD", // TODO: Update
      image: two_diamonds,
    },
    {
      creditAmount: 1000,
      price: 80,
      stripeId: "price_1OEfQEAaPyl1Ov3PGzbZPdgD", // TODO: Update
      image: three_diamonds,
    },
  ];

  /* -------------------------------- FUNCTIONS ------------------------------- */
  const handleCheckout = () => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `${process.env.REACT_APP_BACKEND_URL}/checkout`;

    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "submit_param";
    hiddenInput.value = "checkout";
    form.appendChild(hiddenInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  useEffect(() => {
    // Check to see if there is a redirect back from Checkout
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      setMessage("Order placed! You will receive an email confirmation.");
    }
    if (query.get("canceled")) {
      setMessage(
        "Order canceled -- continue to shop around and checkout when you're ready."
      );
    }
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <Dialog open={true} fullScreen>
      {/* --------------------------------- APP BAR -------------------------------- */}
      <Toolbar
        display="flex"
        className="header"
        sx={{ backgroundColor: theme.palette.primary.main }}
      >
        {/* LOGO */}
        <img src={logo} alt="Logo" />

        {/* CLOSE BUTTON */}
        <Fab
          component={Link}
          to="/generate"
          color="secondary"
          aria-label="close"
          size="small"
          sx={{
            borderRadius: "20px",
            position: "absolute",
            top: "1rem",
            right: "1rem",
          }}
        >
          <CloseTwoToneIcon />
        </Fab>
      </Toolbar>

      {/* ----------------------------- ACCOUNT DETAILS ---------------------------- */}

      <DialogContent
        sx={{
          backgroundColor: theme.palette.primary.main,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h5"
          component="div"
          sx={{ flexGrow: 1, color: theme.palette.secondary.dark, mb: "1rem" }}
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
            backgroundColor: "#FFFFFF",
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
              backgroundColor: theme.palette.primary.light,
              padding: "0.5rem",
              borderRadius: "8px",
              width: "200px",
              margin: "0px auto"
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
            <PurchaseCard
              purchaseItem={item}
              handleCheckout={handleCheckout}
              index={index}
            />
          ))}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
