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

export default async function RootLayout({ children }) {
  const user = await getUserInfo();
  const headersList = headers();

  return (
    <html lang="en">
      <body className={inter.className}>
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
