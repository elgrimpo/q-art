import {
    Box,
    Typography,
  } from "@mui/material";

  const GIF_URL =
    "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXd0ZmY4N3VweW54ejIwN29yaGQxcmdtOWh5aGZuMG1wZW5mdHprYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/R8dDMt8IgVvhK/giphy.gif";

  const GeneratingLoader = ({ fill = false }) => {

    return (
        <Box
        sx={{
          position: "relative",
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          ...(fill
            ? { height: "100%" }
            : { maxWidth: "800px", margin: "auto", aspectRatio: "1/1" }),
        }}
      >
        <Box
          component="img"
          src={GIF_URL}
          alt="Generating…"
          sx={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            objectPosition: "center 25%",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 70%)",
          }}
        />
        <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: "20px 22px" }}>
          <Typography variant="h5" sx={{ fontSize: "30px", lineHeight: 1.15, color: "primary.main" }}>
            Our superhuman AI is working on your QR Code!
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.45 }}>
            He's slow so give him a minute!
          </Typography>
        </Box>
      </Box>
    );
  };

  export default GeneratingLoader;
