import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/_styles/theme";
import Providers from "./providers";

import AmplitudeContextProvider from "@/_context/amplitudeContext";
import { StoreInitializer } from "@/_components/StoreInitializer";
import { getUserInfo } from "@/_utils/userUtils";
import { Toaster } from "@/_components/Toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Display serif used sparingly for marketing headlines (H1/H2) — see
// design/fontstyling.md. Instrument Serif only ships a 400 weight on Google
// Fonts, which matches the spec exactly.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const metadata = {
  // Without metadataBase, Next.js builds absolute URLs for metadata images
  // (including the opengraph-image file convention) from http://localhost:<port>,
  // which breaks every social share preview in production. (SEO audit 2026-06)
  metadataBase: new URL("https://www.qr-ai.co"),
  title: "AI QR Code Art Generator | QR AI",
  description:
    "Transform any URL into AI-generated QR code artwork. Free to try — pick a style, download a fully scannable art QR code. No design skills needed.",
  openGraph: {
    siteName: "QR AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "QR AI",
  url: "https://www.qr-ai.co",
  description: "AI-powered QR code art generator",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "QR AI",
  url: "https://www.qr-ai.co",
  logo: "https://www.qr-ai.co/logo.png",
};

export default async function RootLayout({ children }) {
  const user = await getUserInfo();

  return (
    <html lang="en">
      <body className={`${inter.variable} ${instrumentSerif.variable} ${inter.className}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Providers>
          <ThemeProvider theme={theme}>
            <StoreInitializer user={user}>
              <AmplitudeContextProvider>
                <Toaster />
                {children}
              </AmplitudeContextProvider>
            </StoreInitializer>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
