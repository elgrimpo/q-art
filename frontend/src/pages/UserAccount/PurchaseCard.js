import React from "react";
import {
  Typography,
  Button,
  Card,
  CardActionArea,
  CardMedia,
  Grid
} from "@mui/material";
import theme from "../../styles/mui-theme";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function PurchaseCard(props) {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const { purchaseItem, handleCheckout } = props;

  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <Grid item xs={1} sm={1} md={1}>
    <Card
      // raised={true}
      sx={{
        backgroundColor: theme.palette.primary.main,
        borderRadius: "16px",
        maxWidth: "400px",
        margin: "0px auto"
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
      <CardActionArea sx={{ display: "flex", m: "1rem 0rem" }}>
        <Button
          align="center"
          variant="contained"
          color="secondary"
          onClick={() => handleCheckout(purchaseItem)}
          sx={{ padding: "0.5rem 4rem" }}
        >
          {`${purchaseItem.price} USD`}
        </Button>
      </CardActionArea>
    </Card>
    </Grid>
  );
}
