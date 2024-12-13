import {
    Box,
    Typography,
  } from "@mui/material";
  import theme from "@/_styles/theme";

  
  const GeneratingLoader = () => {
  
    return (
        <Box
        sx={{
          position: "relative",
          padding: "1rem",
          width: "100%",
          maxWidth: "800px",
          margin: "auto",
          borderRadius: "8px",
          backgroundColor: theme.palette.primary.light,
          textAlign: { xs: 'center', md: 'left' }
        }}
      >
        <Typography variant="h5" color="secondary" className="form-title">
          Our superhuman AI is working on your QR Code!
        </Typography>

        <Box
          sx={{
            margin: "1rem 0rem",
            width: "100%",
            maxWidth: "800px",
            height: "400px",
            backgroundImage:
              'url("https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXd0ZmY4N3VweW54ejIwN29yaGQxcmdtOWh5aGZuMG1wZW5mdHprYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/R8dDMt8IgVvhK/giphy.gif")',
            backgroundSize: "cover",
            backgroundPosition: "center 25%",
            borderRadius: "8px",
            overflow: "hidden",
            
          }}
        ></Box>
        <Typography variant="subtitle1">
          He's slow so give him a minute!
        </Typography>
      </Box>
    );
  };
  
  export default GeneratingLoader;
  