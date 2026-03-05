import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // <-- MUST HAVE THIS IMPORT

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SocratiQ",
  description: "The AI Study Buddy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* <-- MUST WRAP CHILDREN LIKE THIS --> */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}