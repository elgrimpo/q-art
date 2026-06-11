import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/_styles/theme";
import Providers from "./providers";

import AmplitudeContextProvider from "@/_context/amplitudeContext";
import { StoreInitializer } from "@/_components/StoreInitializer";
import { getUserInfo } from "@/_utils/userUtils";
import { Toaster } from "@/_components/Toaster";
import { headers } from 'next/headers';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "QR AI",
  description: "Turn your QR Code into a piece of Art",
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
  const headersList = headers();

  return (
    <html lang="en">
      <body className={inter.className}>
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
