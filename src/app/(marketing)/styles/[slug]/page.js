import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import ArrowOutwardOutlined from "@mui/icons-material/ArrowOutwardOutlined";
import BrushOutlined from "@mui/icons-material/BrushOutlined";
import QrCode2Outlined from "@mui/icons-material/QrCode2Outlined";
import LocalPrintshopOutlined from "@mui/icons-material/LocalPrintshopOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import LocalCafeOutlined from "@mui/icons-material/LocalCafeOutlined";
import CelebrationOutlined from "@mui/icons-material/CelebrationOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShareOutlined from "@mui/icons-material/ShareOutlined";
import {
  stylesWithLandingPage,
  findStyleByLandingSlug,
  isRichLandingPage,
} from "@/_utils/ImageStyles";
import { getImages } from "@/_utils/ImagesUtils";
import ExamplesCarousel from "./ExamplesCarousel";

const ICONS = {
  BrushOutlined,
  QrCode2Outlined,
  LocalPrintshopOutlined,
  FavoriteBorderOutlined,
  LocalCafeOutlined,
  CelebrationOutlined,
  Inventory2Outlined,
  ShareOutlined,
};

// Different portrait ratios per column so the Perfect For cards stagger
// like a Pinterest board instead of lining up as uniform squares.
const PERFECT_FOR_RATIOS = ["3 / 4", "1 / 1", "4 / 5"];

export function generateStaticParams() {
  return stylesWithLandingPage().map((s) => ({ slug: s.landingPage.slug }));
}

export function generateMetadata({ params }) {
  const style = findStyleByLandingSlug(params.slug);
  if (!style) return {};
  const lp = style.landingPage;
  const url = `https://www.qr-ai.co/styles/${lp.slug}`;
  const heading = lp.heading || `${lp.headingLines?.join(" ")}`;
  return {
    title: lp.metaTitle,
    description: lp.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: heading,
      description: lp.metaDescription,
      url,
      siteName: "QR AI",
      type: "website",
      images: [{ url: style.image_url, width: 1024, height: 1024 }],
    },
  };
}

export default async function StylePage({ params }) {
  const style = findStyleByLandingSlug(params.slug);
  if (!style) notFound();

  const lp = style.landingPage;
  const rich = isRichLandingPage(lp);
  const otherStyle = stylesWithLandingPage().find(
    (s) => s.landingPage.slug !== lp.slug,
  );

  let examples = [];
  if (rich) {
    try {
      examples =
        (await getImages({
          image_style: style.title,
          featured: true,
          images_per_page: 8,
        })) || [];
    } catch {
      examples = [];
    }
  }

  return rich ? (
    <RichStyleLayout style={style} lp={lp} examples={examples} />
  ) : (
    <SimpleStyleLayout style={style} lp={lp} otherStyle={otherStyle} />
  );
}

/* ---------------------------------------------------------------------- */
/*                            SIMPLE LAYOUT                                */
/* ---------------------------------------------------------------------- */
/* Used until a style has promptIdeas/perfectFor content written for it —  */
/* see ImageStyles.js. Thin, text-first, matches the site's other          */
/* marketing pages (faq, pricing, blog).                                   */

const h2 = { fontSize: "1.4rem", mb: 2, mt: 5 };
const p = { mb: 3, lineHeight: 1.8, color: "text.secondary" };

function SimpleStyleLayout({ style, lp, otherStyle }) {
  return (
    <Box sx={{ maxWidth: "760px", mx: "auto" }}>
      <Typography
        component="h1"
        variant="h1"
        sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, mb: 2, lineHeight: 1.2 }}
      >
        {lp.heading}
      </Typography>
      <Typography
        component="p"
        sx={{ mb: 4, color: "text.secondary", fontSize: "1.1rem", lineHeight: 1.8 }}
      >
        {lp.intro}
      </Typography>

      <Box
        sx={{
          mb: 2,
          maxWidth: 420,
          mx: "auto",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Image
          src={style.image_url}
          alt={`Example ${style.title} style AI-generated QR code`}
          width={800}
          height={800}
          priority
          sizes="(max-width: 460px) 100vw, 420px"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </Box>

      <Box sx={{ textAlign: "center", mb: 6, mt: 3 }}>
        <Link href={`/generate?style=${lp.slug}`} passHref>
          <Button variant="contained" size="large">
            Generate a {style.title} QR code — free
          </Button>
        </Link>
      </Box>

      <Typography variant="h2" color="primary" sx={h2}>
        Why {style.title}?
      </Typography>
      <Box
        component="ul"
        sx={{ pl: 3, mb: 3, color: "text.secondary", "& li": { mb: 1.5, lineHeight: 1.8 } }}
      >
        {lp.why.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </Box>

      <Typography variant="h2" color="primary" sx={h2}>
        Where it works well
      </Typography>
      <Box
        component="ul"
        sx={{ pl: 3, mb: 3, color: "text.secondary", "& li": { mb: 1.5, lineHeight: 1.8 } }}
      >
        {lp.useCases.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </Box>

      <Typography component="p" sx={p}>
        Every QR AI style uses the same error-correction and ControlNet
        guidance under the hood, so a {style.title} code scans exactly like
        any other. See{" "}
        <Link
          href="/blog/are-artistic-qr-codes-scannable"
          style={{ color: "#70E195" }}
        >
          our scannability guide
        </Link>{" "}
        for the details.
      </Typography>

      {otherStyle && (
        <Typography component="p" sx={{ ...p, mb: 6 }}>
          Prefer a different look?{" "}
          <Link
            href={`/styles/${otherStyle.landingPage.slug}`}
            style={{ color: "#70E195" }}
          >
            Try the {otherStyle.title} style →
          </Link>
        </Typography>
      )}

      <Box
        sx={{
          textAlign: "center",
          py: 5,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Link href={`/generate?style=${lp.slug}`} passHref>
          <Button variant="contained" size="large">
            Try it free — no sign-up required
          </Button>
        </Link>
      </Box>
    </Box>
  );
}

/* ---------------------------------------------------------------------- */
/*                              RICH LAYOUT                                 */
/* ---------------------------------------------------------------------- */

function AccentHeading({ lines, accent }) {
  const [line1, line2] = lines;
  const parts = line2.split(accent);
  return (
    <Typography
      component="h1"
      variant="h1"
      sx={{
        fontSize: { xs: "2.5rem", md: "3.5rem" },
        fontWeight: 900,
        fontFamily: "var(--font-inter), Inter, sans-serif",
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
        mb: 2,
      }}
    >
      {line1}
      <br />
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <Box component="span" sx={{ color: "primary.main" }}>
              {accent}
            </Box>
          )}
        </span>
      ))}
    </Typography>
  );
}

function RichStyleLayout({ style, lp, examples }) {
  const generateHref = `/generate?style=${lp.slug}`;

  return (
    <Box sx={{ maxWidth: "1120px", mx: "auto" }}>
      {/* Hero */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          gap: { xs: 4, md: 6 },
          mb: 8,
        }}
      >
        <Box sx={{ flex: "1 1 420px", textAlign: { xs: "center", md: "left" } }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              backgroundColor: "rgba(112, 225, 149, 0.08)",
              border: "1px solid",
              borderColor: "primary.main",
              mb: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "primary.main",
                textTransform: "uppercase",
              }}
            >
              {lp.badge}
            </Typography>
          </Box>

          <AccentHeading lines={lp.headingLines} accent={lp.headingAccent} />

          <Typography
            component="p"
            sx={{ mb: 3, color: "text.secondary", fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 480 }}
          >
            {lp.intro}
          </Typography>

          <Link href={generateHref} passHref>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowOutwardOutlined />}
              sx={{ mb: 3 }}
            >
              Generate with this style
            </Button>
          </Link>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
              justifyContent: { xs: "center", md: "flex-start" },
            }}
          >
            {lp.features.map((f) => {
              const Icon = ICONS[f.icon];
              return (
                <Box key={f.label} sx={{ display: "flex", alignItems: "center", gap: 1, maxWidth: 140 }}>
                  {Icon && <Icon sx={{ color: "primary.main", fontSize: 20, flexShrink: 0 }} />}
                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", lineHeight: 1.3, textAlign: "left" }}>
                    {f.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box
          sx={{
            flex: "1 1 420px",
            width: "100%",
            maxWidth: 460,
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Image
            src={style.image_url}
            alt={`Example ${style.title} style AI-generated QR code`}
            width={900}
            height={900}
            priority
            sizes="(max-width: 460px) 100vw, 460px"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </Box>
      </Box>

      {/* Examples */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h2" sx={{ fontSize: { xs: "1.3rem", md: "1.6rem" }, mb: 3 }}>
          {style.title} QR Code Examples
        </Typography>
        <ExamplesCarousel
          initialExamples={examples}
          styleTitle={style.title}
          caption={lp.exampleCaption}
        />
      </Box>

      {/* Prompt ideas */}
      <Box
        sx={{
          mb: 8,
          p: { xs: 3, md: 5 },
          borderRadius: 3,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h2" sx={{ fontSize: { xs: "1.3rem", md: "1.6rem" }, mb: 3 }}>
          Best Prompt Ideas
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}>
          {lp.promptIdeas.map((prompt) => (
            <Link
              key={prompt}
              href={`/generate?style=${lp.slug}&prompt=${encodeURIComponent(prompt)}`}
              style={{ textDecoration: "none" }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 1.2,
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: "primary.main",
                  color: "text.secondary",
                  fontSize: "0.9rem",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                  "&:hover": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                  },
                }}
              >
                {prompt}
              </Box>
            </Link>
          ))}
        </Box>
      </Box>

      {/* Perfect for — Pinterest-style masonry: 3 full-width columns, each
          card a different portrait ratio so heights stagger naturally. */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h2" sx={{ fontSize: { xs: "1.3rem", md: "1.6rem" }, mb: 3 }}>
          Perfect For
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            alignItems: "start",
            gap: 2,
          }}
        >
          {lp.perfectFor.slice(0, 3).map((card, i) => {
            const Icon = ICONS[card.icon];
            return (
              <Box
                key={card.title}
                sx={{
                  aspectRatio: PERFECT_FOR_RATIOS[i % PERFECT_FOR_RATIOS.length],
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                }}
              >
                {card.imageUrl && (
                  <Image
                    src={card.imageUrl}
                    alt={card.title}
                    fill
                    sizes="(max-width: 600px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                )}
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(0deg, rgba(0,0,0,0.8), rgba(0,0,0,0.25) 65%)",
                  }}
                />
                <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, p: 2.5 }}>
                  {Icon && <Icon sx={{ color: "primary.main", fontSize: 26, mb: 1 }} />}
                  <Typography sx={{ fontWeight: 600, fontSize: "1rem", mb: 0.5, color: "text.primary" }}>
                    {card.title}
                  </Typography>
                  <Typography sx={{ fontSize: "0.85rem", color: "text.muted", lineHeight: 1.5 }}>
                    {card.description}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Bottom CTA */}
      <Box
        sx={{
          mt: 6,
          p: { xs: 4, md: 6 },
          borderRadius: 3,
          background: "linear-gradient(135deg, rgba(112,225,149,0.14), rgba(112,225,149,0.02))",
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontSize: { xs: "1.3rem", md: "1.5rem" }, mb: 1 }}>
            Ready to create your {style.title.toLowerCase()} QR code?
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            Turn links into living art — scannable, and beautifully styled.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Link href={generateHref} passHref>
            <Button variant="contained" size="large" endIcon={<ArrowOutwardOutlined />}>
              Generate with this style
            </Button>
          </Link>
          <Link href="/explore" passHref>
            <Button variant="outlined" size="large">
              Explore examples
            </Button>
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
