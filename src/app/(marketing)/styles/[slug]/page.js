import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import { styleContent, styleSlugs } from "./styleContent";

export function generateStaticParams() {
  return styleSlugs.map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const style = styleContent[params.slug];
  if (!style) return {};
  const url = `https://www.qr-ai.co/styles/${style.slug}`;
  return {
    title: style.metaTitle,
    description: style.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: style.heading,
      description: style.metaDescription,
      url,
      siteName: "QR AI",
      type: "website",
      images: [{ url: style.styleImageUrl, width: 1024, height: 1024 }],
    },
  };
}

const h2 = { fontSize: "1.4rem", mb: 2, mt: 5 };
const p = { mb: 3, lineHeight: 1.8, color: "text.secondary" };

export default function StylePage({ params }) {
  const style = styleContent[params.slug];
  if (!style) notFound();

  const otherStyle = Object.values(styleContent).find(
    (s) => s.slug !== style.slug,
  );

  return (
    <Box sx={{ maxWidth: "760px", mx: "auto" }}>
      <Typography
        component="h1"
        variant="h1"
        sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, mb: 2, lineHeight: 1.2 }}
      >
        {style.heading}
      </Typography>
      <Typography
        component="p"
        sx={{ mb: 4, color: "text.secondary", fontSize: "1.1rem", lineHeight: 1.8 }}
      >
        {style.intro}
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
          src={style.styleImageUrl}
          alt={`Example ${style.title} style AI-generated QR code`}
          width={800}
          height={800}
          priority
          sizes="(max-width: 460px) 100vw, 420px"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </Box>

      <Box sx={{ textAlign: "center", mb: 6, mt: 3 }}>
        <Link href={`/generate?style=${style.slug}`} passHref>
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
        {style.why.map((line) => (
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
        {style.useCases.map((line) => (
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
            href={`/styles/${otherStyle.slug}`}
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
        <Link href={`/generate?style=${style.slug}`} passHref>
          <Button variant="contained" size="large">
            Try it free — no sign-up required
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
