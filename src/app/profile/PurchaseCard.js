"use client";

// Libraries imports
import React from "react";
import { Typography, Button, Card, CardMedia, Grid } from "@mui/material";
import axios from "axios";

// App imports
import theme from "@/_styles/theme";
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function PurchaseCard(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { purchaseItem } = props;

  const { user, openAlert } = useStore();

  const handleCheckout = (item) => {
    // API call
    axios
      .post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout`, null, {
        params: {
          stripeId: item.stripeId,
          credit_amount: item.creditAmount,
          user_id: user._id,
        },
        withCredentials: true,
      })
      .then((res) => {
        if (res.data && res.data.session_url) {
          // Redirect to the Stripe Checkout URL
          const sessionURL = res.data.session_url;
          window.location.href = sessionURL;
        } else {
          console.error("Invalid response or missing session URL");
          openAlert("error", "Payment session could not be opened.");
        }
      })
      // Error handling
      .catch((err) => {
        openAlert("error", "Credit purchase failed.");
        console.log(err);
      });
  };
  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <Grid item xs={1} sm={1} md={1}>
      <Card
        sx={{
          backgroundColor: theme.palette.primary.main,
          borderRadius: "16px",
          maxWidth: "400px",
          margin: "0px auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          align="center"
          variant="h5"
          sx={{ fontSize: "4rem", mt: "1rem" }}
        >
          {purchaseItem.creditAmount}
        </Typography>
        <CardMedia component="img" image={purchaseItem.image}></CardMedia>

        <Button
          align="center"
          variant="contained"
          color="secondary"
          onClick={() => handleCheckout(purchaseItem)}
          sx={{ padding: "0.5rem 4rem", margin: "1rem 0rem" }}
        >
          {`${purchaseItem.price} USD`}
        </Button>
      </Card>
    </Grid>
  );
}
