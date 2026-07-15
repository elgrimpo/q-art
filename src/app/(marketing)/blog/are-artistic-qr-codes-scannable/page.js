import Link from "next/link";
import Image from "next/image";
import { Box, Typography, Button } from "@mui/material";
import BeforeAfterSlider from "../qr-code-that-looks-like-art/BeforeAfterSlider";

const POST_URL =
  "https://www.qr-ai.co/blog/are-artistic-qr-codes-scannable";
const PUBLISHED = "2026-07-15";

export const metadata = {
  title:
    "Are Artistic QR Codes Scannable? Here's What Actually Matters | QR AI",
  description:
    "Do artistic AI QR codes actually scan? Yes — here's why error correction makes it possible, what makes a code fail, and how to guarantee yours works before you print it.",
  alternates: {
    canonical: POST_URL,
  },
  openGraph: {
    title: "Are Artistic QR Codes Scannable? Here's What Actually Matters",
    description:
      "Do artistic AI QR codes actually scan? Yes — here's why, what makes one fail, and how to guarantee yours works.",
    url: POST_URL,
    siteName: "QR AI",
    type: "article",
    publishedTime: PUBLISHED,
    images: [{ url: "/blog/weight-high.webp", width: 500, height: 500 }],
  },
};

// BlogPosting structured data — makes the post eligible for article rich results
// and gives AI search engines a clean, citable summary.
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Are Artistic QR Codes Scannable? Here's What Actually Matters",
  description:
    "Do artistic AI QR codes actually scan? Yes — here's why error correction makes it possible, what makes a code fail, and how to guarantee yours works before you print it.",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  author: { "@type": "Organization", name: "QR AI", url: "https://www.qr-ai.co" },
  publisher: {
    "@type": "Organization",
    name: "QR AI",
    url: "https://www.qr-ai.co",
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": POST_URL },
  url: POST_URL,
  image: "https://www.qr-ai.co/blog/weight-high.webp",
};

// Also eligible as a direct-answer FAQ entry — the core question of the post
// is itself a common search query.
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Are artistic QR codes scannable?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — a well-made artistic QR code scans exactly like a plain one. QR codes are generated with error correction, extra redundancy that lets up to 30% of the pattern be visually altered while still reading correctly. AI QR generators use that same margin to add artwork without breaking the underlying code, guided by a ControlNet system that preserves the QR structure during generation.",
      },
    },
  ],
};

const h2 = { fontSize: "1.6rem", mb: 2, mt: 6 };
const p = { mb: 3, lineHeight: 1.8, color: "text.secondary" };

export default function AreArtisticQrCodesScannablePost() {
  return (
    <Box sx={{ maxWidth: "760px", mx: "auto" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Breadcrumb back to the blog index */}
      <Typography component="p" sx={{ mb: 3, fontSize: "0.9rem" }}>
        <Link href="/blog" style={{ color: "#70E195", textDecoration: "none" }}>
          ← QR AI Blog
        </Link>
      </Typography>

      <Typography
        component="h1"
        variant="h1"
        sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mb: 2, lineHeight: 1.2 }}
      >
        Are Artistic QR Codes Scannable? Here&rsquo;s What Actually Matters
      </Typography>

      <Typography
        component="p"
        sx={{
          mb: 6,
          color: "text.secondary",
          fontSize: "1.15rem",
          lineHeight: 1.8,
        }}
      >
        Short answer: <strong>yes, a well-made artistic QR code scans exactly
        like a plain one</strong> &mdash; the artwork isn&rsquo;t decoration
        layered on top of a QR code, it&rsquo;s generated with the code&rsquo;s
        own structure baked in. But &ldquo;well-made&rdquo; is doing some work
        in that sentence, and whether any specific code you generate scans
        reliably depends on a few things you actually control. Here&rsquo;s the
        honest breakdown.
      </Typography>

      {/* Hero example */}
      <Box sx={{ mb: 2, maxWidth: 420, mx: "auto", borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
        <Image
          src="/blog/weight-high.webp"
          alt="A real AI-generated art QR code at a high QR weight setting — built for reliability, still scannable"
          width={500}
          height={500}
          priority
          sizes="(max-width: 460px) 100vw, 420px"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </Box>
      <Typography component="p" sx={{ mb: 6, fontSize: "0.85rem", color: "text.muted", textAlign: "center" }}>
        A real QR AI output, generated at a QR weight setting tuned for
        reliability &mdash; not just looks.
      </Typography>

      <Typography variant="h2" color="primary" sx={h2}>
        Why this even works
      </Typography>
      <Typography component="p" sx={p}>
        Every QR code is built with spare capacity called error correction
        &mdash; redundancy in the pattern so a scanner can still read it even
        if part of the code is dirty, scratched, faded, or covered by a logo.
        At the highest error correction level (the one QR AI uses by default),
        up to 30% of the code can be visually altered and it will still decode
        correctly.
      </Typography>
      <Typography component="p" sx={p}>
        An artistic QR generator doesn&rsquo;t fight that redundancy &mdash; it
        uses it. The AI image model generates within a guidance system
        (ControlNet) that&rsquo;s specifically trained to preserve the
        underlying dark/light QR structure while painting the rest of the
        image around it. The QR pattern isn&rsquo;t hidden under the art; it{" "}
        <em>is</em> the art, just interpreted through a style like watercolor,
        ink, or ukiyo-e. See our{" "}
        <Link href="/blog/qr-code-that-looks-like-art" style={{ color: "#70E195" }}>
          guide to how AI QR codes are made
        </Link>{" "}
        for the full pipeline.
      </Typography>

      <BeforeAfterSlider
        beforeSrc="/blog/slider-plain.webp"
        afterSrc="/blog/slider-art.webp"
        beforeAlt="A plain black-and-white QR code linking to qr-ai.co"
        afterAlt="The same link rendered as ukiyo-e koi fish artwork that still scans"
      />

      <Typography variant="h2" color="primary" sx={h2}>
        So why do some artistic QR codes fail to scan?
      </Typography>
      <Typography component="p" sx={p}>
        The same reasons any QR code fails, just more likely when you&rsquo;re
        also asking it to look like a painting:
      </Typography>
      <Box
        component="ul"
        sx={{ pl: 3, mb: 3, color: "text.secondary", "& li": { mb: 1.5, lineHeight: 1.8 } }}
      >
        <li>
          <strong>The URL is too long.</strong> Longer text means a denser
          pattern with less spare capacity for the AI to work with. This is
          the single biggest lever &mdash; shortening your destination URL
          gives the AI more room and produces more reliable results.
        </li>
        <li>
          <strong>The style leans too abstract for the use case.</strong> Some
          styles preserve the grid more faithfully than others. A subtle,
          painterly result that looks great on a phone screen can lose too
          much structure for a scanner in bad lighting.
        </li>
        <li>
          <strong>Low contrast, especially in print.</strong> A code that
          reads fine on a backlit screen can lose definition on a
          low-quality print job. Busy backgrounds and anything printed
          smaller than about 2cm &times; 2cm make this worse.
        </li>
        <li>
          <strong>It just wasn&rsquo;t tested.</strong> AI output varies from
          generation to generation &mdash; even the same prompt and style can
          produce a slightly different result each time. Skipping the test
          step is the most common reason a code makes it to print and then
          doesn&rsquo;t work.
        </li>
      </Box>
      <Typography component="p" sx={p}>
        None of these are flaws unique to AI-generated codes &mdash;
        they&rsquo;re the same failure modes as any QR code design. AI QR
        generation just makes it easier to accidentally trip over them,
        because you&rsquo;re optimizing for how it looks as well as how it
        scans.
      </Typography>

      <Typography variant="h2" color="primary" sx={h2}>
        How to make sure yours works
      </Typography>
      <Box
        component="ol"
        sx={{ pl: 3, mb: 3, color: "text.secondary", "& li": { mb: 2, lineHeight: 1.8 } }}
      >
        <li>
          <strong>Shorten the URL first.</strong> Use a link shortener or a
          clean landing page URL before you generate &mdash; this alone fixes
          most scan issues before they happen.
        </li>
        <li>
          <strong>Turn up the QR weight for anything important.</strong> Most
          artistic QR tools, including QR AI, give you a slider that trades
          artistic abstraction for scan reliability. The default setting
          works for casual, low-stakes use (a social post, a gift). For
          anything going to print or representing a business &mdash; menus,
          packaging, business cards &mdash; push it higher.
        </li>
        <li>
          <strong>Pick a style that suits the job, not just the vibe.</strong>{" "}
          Some styles hold the grid more visibly than others. If reliability
          matters more than subtlety, a slightly more structured style is the
          safer choice.
        </li>
        <li>
          <strong>Always test before you commit.</strong> Scan the actual
          generated image &mdash; not a mockup &mdash; with at least two
          different scanners (iOS Camera and a separate Android QR app are a
          good baseline) before you print, post, or send it anywhere
          permanent.
        </li>
        <li>
          <strong>Regenerate if it&rsquo;s stubborn.</strong> AI output has
          variance. If one generation doesn&rsquo;t scan cleanly, running it
          again &mdash; or nudging the QR weight up &mdash; usually fixes it.
        </li>
      </Box>

      {/* QR weight comparison */}
      <Box sx={{ display: "flex", gap: 2, my: 4, flexWrap: "wrap" }}>
        {[
          {
            src: "/blog/weight-low.webp",
            alt: "Art QR code at a low QR weight — highly artistic, QR pattern subtle",
            label: "Low QR weight",
            sub: "More artistic, less margin for error",
          },
          {
            src: "/blog/weight-high.webp",
            alt: "Art QR code at a high QR weight — QR pattern prominent and easy to scan",
            label: "High QR weight",
            sub: "The safer choice for print & business use",
          },
        ].map((it) => (
          <Box key={it.label} sx={{ flex: "1 1 200px" }}>
            <Box sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Image
                src={it.src}
                alt={it.alt}
                width={500}
                height={500}
                sizes="(max-width: 760px) 50vw, 360px"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </Box>
            <Typography component="p" sx={{ mt: 1, fontWeight: 600, color: "primary.main", fontSize: "0.95rem" }}>
              {it.label}
            </Typography>
            <Typography component="p" sx={{ color: "text.muted", fontSize: "0.85rem" }}>
              {it.sub}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="h2" color="primary" sx={h2}>
        Is this reliable enough for a real business?
      </Typography>
      <Typography component="p" sx={p}>
        Plenty of small businesses already use AI-generated QR codes for
        things like restaurant menus, packaging, and marketing materials, and
        it works well when the same basics above are followed: higher QR
        weight, a short URL, real testing across devices, and print contrast
        that isn&rsquo;t fighting a busy background. It&rsquo;s not
        &ldquo;generate once and hope&rdquo; &mdash; it&rsquo;s the same due
        diligence you&rsquo;d want for a QR code printed on a menu even if a
        designer made it by hand. The advantage of doing it right is that the
        code stops looking like an afterthought bolted onto the page.
      </Typography>

      <Box sx={{ mb: 2, maxWidth: 320, mx: "auto", borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", aspectRatio: "1 / 1", position: "relative" }}>
        <Image
          src="/product-placements/restaurants-food-trucks.png"
          alt="Art QR code used on a restaurant menu"
          fill
          sizes="(max-width: 400px) 100vw, 320px"
          style={{ objectFit: "cover" }}
        />
      </Box>
      <Typography component="p" sx={{ mb: 6, fontSize: "0.85rem", color: "text.muted", textAlign: "center" }}>
        A higher QR weight is usually the right call for menus, packaging, and
        anything representing a business.
      </Typography>

      <Typography component="p" sx={p}>
        More on getting reliable results in our{" "}
        <Link href="/faq" style={{ color: "#70E195" }}>
          FAQ
        </Link>{" "}
        and{" "}
        <Link href="/how-it-works" style={{ color: "#70E195" }}>
          how-it-works guide
        </Link>
        .
      </Typography>

      <Box
        sx={{
          textAlign: "center",
          py: 5,
          mt: 4,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h3" color="primary" sx={{ mb: 2, fontSize: "1.4rem" }}>
          See for yourself
        </Typography>
        <Typography component="p" sx={{ mb: 3, color: "text.secondary" }}>
          The fastest way to answer &ldquo;will this actually scan&rdquo; for
          your specific case is to generate one and test it &mdash; free, no
          sign-up required.
        </Typography>
        <Link href="/generate" passHref>
          <Button variant="contained" size="large">
            Try it free
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
