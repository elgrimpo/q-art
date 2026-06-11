"use client";

// Libraries imports
import React from "react";
import { Typography, Button, Card, CardMedia, Grid } from "@mui/material";

// App imports
import theme from "@/_styles/theme";
import { useStore } from "@/store";
import { createCheckout } from "@/_utils/paymentUtils";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function PurchaseCard(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { purchaseItem } = props;

  const { openAlert } = useStore();

  const handleCheckout = async (item) => {
    try {
      const sessionURL = await createCheckout(item);
      if (sessionURL) {
        window.location.href = sessionURL;
      } else {
        console.error("Invalid response or missing session URL");
        openAlert("error", "Payment session could not be opened.");
      }
    } catch (err) {
      openAlert("error", "Credit purchase failed.");
      console.log(err);
    }
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
