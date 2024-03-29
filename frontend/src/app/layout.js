import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@mui/material/styles";
import theme from "@/_styles/theme";

import { StoreInitializer } from "@/_components/StoreInitializer";
import { getUserInfo } from "@/_utils/userUtils";
import { Toaster } from "@/_components/Toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default async function RootLayout({ children }) {
  const user = await getUserInfo();

  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider theme={theme}>
          <StoreInitializer user={user}>

              <Toaster />
              {children}

          </StoreInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}
