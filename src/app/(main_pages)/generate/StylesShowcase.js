import Link from "next/link";
import Image from "next/image";
import { Box, Typography } from "@mui/material";
import ArrowOutwardOutlined from "@mui/icons-material/ArrowOutwardOutlined";
import { stylesWithLandingPage, styleDisplayName } from "@/_utils/ImageStyles";

export default function StylesShowcase() {
  const styleList = stylesWithLandingPage();

  return (
    <Box component="section" sx={{ mt: { xs: 8, lg: 12 }, width: "100%" }}>
      {/* Heading */}
      <Box sx={{ textAlign: "center", px: 2, mb: { xs: 5, lg: 6 } }}>
        <Typography
          variant="overline"
          sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.08em" }}
        >
          Styles
        </Typography>
        <Typography
          variant="h2"
          sx={{ fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" }, lineHeight: 1.1 }}
        >
          Find Your Style
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ mt: 2, color: "text.secondary", maxWidth: 480, mx: "auto" }}
        >
          Each style is crafted to be beautiful and scannable. Pick one and start creating.
        </Typography>
      </Box>

      {/* Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
          px: { xs: 2, lg: 0 },
        }}
      >
        {styleList.map((style) => {
          const displayTitle = styleDisplayName(style);
          const { slug, tagline } = style.landingPage;
          return (
            <Link
              key={slug}
              href={`/styles/${slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  height: "100%",
                  transition: "border-color 0.15s ease",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Box sx={{ position: "relative", width: "100%", aspectRatio: "1/1" }}>
                  <Image
                    src={style.image_url}
                    alt={`${displayTitle} style example`}
                    fill
                    sizes="(max-width: 900px) 50vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
                    {displayTitle}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.4 }}
                    >
                      {tagline}
                    </Typography>
                    <Box
                      sx={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ArrowOutwardOutlined sx={{ fontSize: 14, color: "text.secondary" }} />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Link>
          );
        })}
      </Box>
    </Box>
  );
}
