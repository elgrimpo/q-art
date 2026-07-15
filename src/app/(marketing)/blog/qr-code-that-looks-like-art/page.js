import Link from "next/link";
import Image from "next/image";
import { Box, Typography, Button } from "@mui/material";
import { styles } from "@/_utils/ImageStyles";
import BeforeAfterSlider from "./BeforeAfterSlider";

const POST_URL =
  "https://www.qr-ai.co/blog/qr-code-that-looks-like-art";
const PUBLISHED = "2026-07-14";

export const metadata = {
  title:
    "How to Make a QR Code That Looks Like Art (and Still Scans) | QR AI",
  description:
    "Learn how AI QR code generators turn ordinary QR codes into watercolor, ink, or ukiyo-e art that still scans. Step-by-step guide + troubleshooting tips.",
  alternates: {
    canonical: POST_URL,
  },
  openGraph: {
    title: "How to Make a QR Code That Looks Like Art (and Still Scans)",
    description:
      "AI QR code generators turn ordinary QR codes into art that still scans. Here's how it works and how to make one yourself.",
    url: POST_URL,
    siteName: "QR AI",
    type: "article",
    publishedTime: PUBLISHED,
    images: [{ url: "/blog/hero.webp", width: 768, height: 768 }],
  },
};

// BlogPosting structured data — makes the post eligible for article rich results
// and gives AI search engines a clean, citable summary.
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "How to Make a QR Code That Looks Like Art (and Still Scans)",
  description:
    "Learn how AI QR code generators turn ordinary QR codes into watercolor, ink, or ukiyo-e art that still scans. Step-by-step guide + troubleshooting tips.",
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
  image: "https://www.qr-ai.co/blog/hero.webp",
};

// A few representative styles for the "pick a style" strip, pulled from the
// same source of truth the generator uses so they never drift.
const STRIP_TITLES = ["Watercolor", "Ukiyo-e", "Ink", "Cyberpunk"];
const styleStrip = STRIP_TITLES.map((t) =>
  styles.find((s) => s.title.toLowerCase() === t.toLowerCase())
).filter(Boolean);

// Shared styles for body prose and section headings, matching the other
// marketing pages (how-it-works, faq).
const h2 = {
  fontSize: "1.6rem",
  mb: 2,
  mt: 6,
};
const p = { mb: 3, lineHeight: 1.8, color: "text.secondary" };

export default function QrCodeThatLooksLikeArtPost() {
  return (
    <Box sx={{ maxWidth: "760px", mx: "auto" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
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
        How to Make a QR Code That Looks Like Art (and Still Scans)
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
        Most QR codes look the same: a flat black-and-white grid that screams
        &ldquo;scan me, then forget me.&rdquo; But QR codes don&rsquo;t have to
        look like that. With the right tool, the same code that links to your
        playlist, your Instagram, or your wedding RSVP page can look like a
        watercolor painting, a woodblock print, or a glowing abstract pattern
        &mdash; and still scan perfectly on a phone. Here&rsquo;s how it actually
        works, and how to make one yourself.
      </Typography>

      {/* Hero example */}
      <Box sx={{ mb: 2, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
        <Image
          src="/blog/hero.webp"
          alt="An AI-generated QR code styled as a low-poly artwork of a castle in the mountains — still fully scannable"
          width={1200}
          height={1200}
          priority
          sizes="(max-width: 760px) 100vw, 760px"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </Box>
      <Typography component="p" sx={{ mb: 6, fontSize: "0.85rem", color: "text.muted", textAlign: "center" }}>
        A working QR code &mdash; made with QR AI. Look closely and you can spot the QR
        finder squares hidden in the artwork.
      </Typography>

      <Typography variant="h2" color="primary" sx={h2}>
        The trick: QR codes have built-in room for error
      </Typography>
      <Typography component="p" sx={p}>
        Every QR code is generated with a level of &ldquo;error
        correction&rdquo; &mdash; extra redundancy baked into the pattern so it
        still scans even if part of it is dirty, scratched, or covered by a logo.
        At the highest error correction level, up to 30% of the code can be
        visually altered and it&rsquo;ll still read correctly.
      </Typography>
      <Typography component="p" sx={p}>
        That 30% margin is what makes artistic QR codes possible. Instead of
        leaving that margin unused, AI image generation tools can fill it with
        actual artwork &mdash; guided by software that knows exactly which parts
        of the pattern are essential and which parts have creative wiggle room.
      </Typography>

      <BeforeAfterSlider
        beforeSrc="/blog/slider-plain.webp"
        afterSrc="/blog/slider-art.webp"
        beforeAlt="A plain black-and-white QR code linking to qr-ai.co"
        afterAlt="The same link rendered as ukiyo-e koi fish artwork that still scans"
      />

      <Typography variant="h2" color="primary" sx={h2}>
        How AI QR code generators work, in plain terms
      </Typography>
      <Typography component="p" sx={p}>
        A tool like{" "}
        <Link href="/generate" style={{ color: "#70E195" }}>
          QR AI
        </Link>{" "}
        takes two inputs: your destination URL (or text) and a style or prompt
        you choose. Behind the scenes:
      </Typography>
      <Box
        component="ol"
        sx={{ pl: 3, mb: 3, color: "text.secondary", "& li": { mb: 1.5, lineHeight: 1.8 } }}
      >
        <li>
          Your URL gets turned into a standard QR pattern, just like any QR
          generator would produce.
        </li>
        <li>
          That pattern is fed into a Stable Diffusion image model alongside your
          chosen art style (watercolor, ink, ukiyo-e, low poly, and so on).
        </li>
        <li>
          A guidance system (ControlNet) keeps the underlying QR structure intact
          while the AI paints over and around it &mdash; so the dark/light squares
          survive as recognizable shapes within the artwork.
        </li>
        <li>
          The output is a single image that reads as art at a glance, but scans
          as a working QR code up close.
        </li>
      </Box>
      <Typography component="p" sx={p}>
        You can adjust how much the AI prioritizes &ldquo;looks like art&rdquo;
        versus &ldquo;definitely scans&rdquo; &mdash; most tools call this
        something like a QR weight or strength slider. Lower settings produce more
        abstract, painterly results; higher settings keep the QR grid more
        visible and more reliable.
      </Typography>

      {/* QR weight comparison */}
      <Box sx={{ display: "flex", gap: 2, my: 4, flexWrap: "wrap" }}>
        {[
          {
            src: "/blog/weight-low.webp",
            alt: "Art QR code at a low QR weight — highly artistic, QR pattern subtle",
            label: "Low QR weight",
            sub: "More artistic, subtler code",
          },
          {
            src: "/blog/weight-high.webp",
            alt: "Art QR code at a high QR weight — QR pattern prominent and easy to scan",
            label: "High QR weight",
            sub: "More reliable, stronger code",
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
        Making your first one: a simple workflow
      </Typography>
      <Box
        component="ol"
        sx={{ pl: 3, mb: 3, color: "text.secondary", "& li": { mb: 2, lineHeight: 1.8 } }}
      >
        <li>
          <strong>Shorten your URL first.</strong> Long URLs create denser, more
          complicated QR patterns, which leaves less room for the AI to work with.
          A URL shortener (or just linking to a clean landing page) gives you a
          simpler pattern and better-looking results.
        </li>
        <li>
          <strong>Pick a style that matches the vibe.</strong> Watercolor and ink
          styles tend to read as &ldquo;art&rdquo; immediately; styles like low
          poly or vector art read as more modern/graphic. Match the style to where
          the code will live &mdash; a wedding invite probably wants something
          different from a streetwear poster.
        </li>
        <li>
          <strong>Add a short prompt for specificity.</strong> Most styles let you
          add a few words on top &mdash; &ldquo;cherry blossoms,&rdquo; &ldquo;neon
          city,&rdquo; &ldquo;vintage botanical&rdquo; &mdash; to push the output
          toward something more personal than the generic style alone.
        </li>
        <li>
          <strong>Generate a few variations.</strong> AI outputs vary generation
          to generation. Run it 2&ndash;3 times and pick the one where the art and
          the QR pattern both look right.
        </li>
        <li>
          <strong>Test before you commit.</strong> This is the step people skip and
          regret. Scan your code with at least two different apps (iOS Camera and a
          separate Android scanner app are a good baseline) before printing it,
          posting it, or sending it anywhere permanent.
        </li>
      </Box>

      {/* Style variety strip */}
      <Typography component="p" sx={{ ...p, mb: 2 }}>
        The same link, four different styles &mdash; a taste of what changing the
        style alone does:
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
          gap: 1.5,
          mb: 5,
        }}
      >
        {styleStrip.map((s) => (
          <Box key={s.id}>
            <Box sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <Image
                src={s.image_url}
                alt={`${s.title} style AI QR code example`}
                width={400}
                height={400}
                sizes="(max-width: 600px) 45vw, 180px"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </Box>
            <Typography component="p" sx={{ mt: 0.75, textAlign: "center", fontSize: "0.8rem", color: "text.secondary" }}>
              {s.title}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="h2" color="primary" sx={h2}>
        When it doesn&rsquo;t scan, here&rsquo;s what to fix
      </Typography>
      <Box
        component="ul"
        sx={{ pl: 3, mb: 3, color: "text.secondary", "& li": { mb: 1.5, lineHeight: 1.8 } }}
      >
        <li>
          <strong>Raise the QR weight/strength setting.</strong> This trades a bit
          of artistic abstraction for scan reliability &mdash; usually the right
          call for anything going to print.
        </li>
        <li>
          <strong>Shorten the URL further.</strong> Every extra character makes the
          pattern denser.
        </li>
        <li>
          <strong>Try a different style.</strong> Some styles preserve the
          underlying grid more faithfully than others.
        </li>
        <li>
          <strong>Check contrast if you&rsquo;re printing.</strong> A QR code with
          good contrast on a screen can lose definition on a low-quality print.
          Avoid placing it over busy backgrounds, and don&rsquo;t print smaller
          than about 2cm &times; 2cm.
        </li>
      </Box>
      <Typography component="p" sx={p}>
        For more on why codes fail to scan and how the AI pipeline keeps them
        readable, see our{" "}
        <Link href="/faq" style={{ color: "#70E195" }}>
          FAQ
        </Link>{" "}
        and{" "}
        <Link href="/how-it-works" style={{ color: "#70E195" }}>
          how-it-works guide
        </Link>
        .
      </Typography>

      <Typography variant="h2" color="primary" sx={h2}>
        Where these actually get used
      </Typography>
      <Typography component="p" sx={p}>
        Artistic QR codes show up anywhere a normal QR code would feel sterile:
        wedding invitations and save-the-dates, gig posters and album art,
        restaurant menus that want to feel designed rather than slapped-on,
        packaging and hang tags, gallery or event signage, and personal projects
        &mdash; gifts, social posts, even novelty codes linking to a video or
        playlist. The common thread: anywhere the QR code itself is part of the
        design, not just a utility bolted onto it.
      </Typography>

      {/* Real-world placements */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 1.5,
          my: 4,
        }}
      >
        {[
          { src: "/product-placements/weddings-stationery.png", alt: "Art QR code on a wedding invitation", cap: "Wedding stationery" },
          { src: "/product-placements/restaurants-food-trucks.png", alt: "Art QR code on a restaurant menu", cap: "Restaurant menus" },
          { src: "/product-placements/music-nightlife.png", alt: "Art QR code on a gig poster", cap: "Posters & nightlife" },
        ].map((it) => (
          <Box key={it.cap}>
            <Box sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", aspectRatio: "1 / 1", position: "relative" }}>
              <Image src={it.src} alt={it.alt} fill sizes="(max-width: 600px) 100vw, 240px" style={{ objectFit: "cover" }} />
            </Box>
            <Typography component="p" sx={{ mt: 0.75, textAlign: "center", fontSize: "0.8rem", color: "text.secondary" }}>
              {it.cap}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="h2" color="primary" sx={h2}>
        Try it yourself
      </Typography>
      <Typography component="p" sx={p}>
        <Link href="/generate" style={{ color: "#70E195" }}>
          QR AI
        </Link>{" "}
        lets you generate one for free without signing up &mdash; pick a style,
        add an optional prompt, and download a scannable result. No account needed
        to try it; sign in with Google later if you want to save your gallery.
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
          Ready to make your own art QR code?
        </Typography>
        <Link href="/generate" passHref>
          <Button variant="contained" size="large">
            Try it free — no sign-up required
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
